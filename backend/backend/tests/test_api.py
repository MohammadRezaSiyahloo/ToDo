import os

os.environ['SECRET_KEY'] = 'test-secret-for-isolated-tests-123456789'
os.environ['DATABASE_URL'] = 'sqlite://'

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.auth import create_access_token
from app.services.tasks import next_deadline


@pytest.fixture
def client():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    def database():
        with factory() as session:
            yield session
    app.dependency_overrides[get_db] = database
    from app.main import rate_limit_store
    rate_limit_store.clear()
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    engine.dispose()


def login(client, name='owner'):
    response = client.post('/api/auth/register', json={'email': f'{name}@example.com', 'username': name, 'password': 'test-password'})
    assert response.status_code == 201, response.text
    return {'Authorization': 'Bearer ' + response.json()['access_token']}


def task(client, headers, **fields):
    response = client.post('/api/tasks/', headers=headers, json={'title': 'Release plan', **fields})
    assert response.status_code == 201, response.text
    return response.json()


def test_search_uses_many_to_many_tags(client):
    headers = login(client)
    tag = client.post('/api/tags/', headers=headers, json={'name': 'Work'}).json()
    task(client, headers, tag_ids=[tag['id']])
    response = client.get('/api/tasks/', headers=headers, params={'search': 'Work'})
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_export_import_preserves_tags_and_state(client):
    owner = login(client)
    tag = client.post('/api/tags/', headers=owner, json={'name': 'Work'}).json()
    task(client, owner, tag_ids=[tag['id']], status='done')
    exported = client.get('/api/tasks/export/json', headers=owner).json()
    other = login(client, 'other')
    response = client.post('/api/tasks/import/json', headers=other, json=exported)
    assert response.status_code == 200, response.text
    imported = client.get('/api/tasks/', headers=other).json()[0]
    assert imported['tags'][0]['name'] == 'Work'
    assert imported['completed'] is True and imported['status'] == 'done'


def test_import_invalid_date_is_atomic(client):
    headers = login(client)
    response = client.post('/api/tasks/import/json', headers=headers, json=[{'title': 'valid'}, {'title': 'bad', 'deadline': 'not-a-date'}])
    assert response.status_code == 422
    assert client.get('/api/tasks/', headers=headers).json() == []


def test_recurring_completion_uses_utc_and_preserves_tags(client):
    headers = login(client)
    tag = client.post('/api/tags/', headers=headers, json={'name': 'Work'}).json()
    now = datetime.now(timezone.utc)
    item = task(client, headers, deadline=now.isoformat(), recurring='daily', recurring_until=(now+timedelta(days=3)).isoformat(), tag_ids=[tag['id']])
    response = client.patch(f"/api/tasks/{item['id']}/toggle", headers=headers)
    assert response.status_code == 200, response.text
    items = client.get('/api/tasks/', headers=headers).json()
    assert len(items) == 2
    following = next(t for t in items if t['id'] != item['id'])
    assert following['tags'][0]['name'] == 'Work'
    assert not following['completed']


def test_monthly_schedule_clamps_month_end():
    assert next_deadline(datetime(2028,1,31), 'monthly') == datetime(2028,2,29)
    assert next_deadline(datetime(2026,12,31), 'monthly') == datetime(2027,1,31)


def test_today_includes_completed_for_progress(client):
    headers = login(client)
    task(client, headers, deadline=datetime.now(timezone.utc).isoformat(), status='done')
    response = client.get('/api/tasks/', headers=headers, params={'today': 'true'})
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]['completed']


def test_status_and_completed_stay_in_sync(client):
    headers = login(client)
    item = task(client, headers, status='done')
    assert item['completed']
    response = client.put(f"/api/tasks/{item['id']}", headers=headers, json={'completed': False})
    assert response.json()['status'] == 'todo'
    response = client.put(f"/api/tasks/{item['id']}", headers=headers, json={'status': 'done'})
    assert response.json()['completed']


def test_invalid_priority_rejected(client):
    headers = login(client)
    assert client.post('/api/tasks/', headers=headers, json={'title': 'bad', 'priority': 'urgent'}).status_code == 422


def test_negative_time_log_rejected(client):
    headers = login(client)
    item = task(client, headers)
    response = client.post(f"/api/time/{item['id']}/log", headers=headers, json={'started_at': '2026-10-01T12:00:00Z', 'ended_at': '2026-10-01T11:00:00Z'})
    assert response.status_code == 422


def test_token_non_numeric_subject_rejected(client):
    token = create_access_token({'sub': 'not-a-number'})
    assert client.get('/api/auth/me', headers={'Authorization': 'Bearer '+token}).status_code == 401


def test_password_byte_limit_does_not_crash(client):
    response = client.post('/api/auth/register', json={'email': 'x@example.com', 'username': 'x', 'password': 'a'*73})
    assert response.status_code == 422
    login(client)
    assert client.post('/api/auth/login', json={'email': 'owner', 'password': 'a'*73}).status_code == 401


def test_cross_user_task_access_denied(client):
    owner = login(client)
    item = task(client, owner)
    other = login(client, 'other')
    for method in ['get', 'delete']:
        assert getattr(client, method)(f"/api/tasks/{item['id']}", headers=other).status_code == 404


def test_https_redirect(client):
    from app.config import settings
    previous = settings.FORCE_HTTPS
    settings.FORCE_HTTPS = True
    try:
        response = client.get('/', follow_redirects=False)
        assert response.status_code == 307
        assert response.headers['location'].startswith('https://')
    finally:
        settings.FORCE_HTTPS = previous
