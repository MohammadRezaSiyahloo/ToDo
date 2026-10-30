import { JSDOM } from "jsdom";
import React from "react";
import { test, before } from "node:test";
import assert from "node:assert/strict";
import type { Task } from "../src/lib/types";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
  IS_REACT_ACT_ENVIRONMENT: true });
let render: typeof import("@testing-library/react").render;
let cleanup: typeof import("@testing-library/react").cleanup;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let waitFor: typeof import("@testing-library/react").waitFor;
let userEvent: typeof import("@testing-library/user-event").default;
let TaskCard: typeof import("../src/components/tasks/task-card").TaskCard;
before(async () => {
  ({ render, cleanup, fireEvent, waitFor } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  TaskCard = (await import("../src/components/tasks/task-card")).TaskCard;
});

const task: Task = { id: 42, title: "Review release", description: null, completed: false,
  pinned: false, status: "todo", priority: "medium", deadline: null, tags: [], subtasks: [],
  comment_count: 0, sort_order: 0, recurring: null, recurring_until: null,
  created_at: "2026-10-31T10:00:00Z", updated_at: "2026-10-31T10:00:00Z" };
const noop = () => {};
const base = { task, onTogglePin: noop, onEdit: noop, onDelete: noop };

test("completion circle saves once while pending, then displays saved completion", async () => {
  const calls: number[] = [];
  let opened = 0;
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  const onToggle = async (id: number) => { calls.push(id); await pending; };
  const view = render(<TaskCard {...base} onToggle={onToggle} onClick={() => { opened++; }} />);
  try {
    const button = view.getByRole("button", { name: "Mark Review release complete" });
    await userEvent.click(button);
    assert.deepEqual(calls, [42]);
    assert.equal(button.getAttribute("aria-busy"), "true");
    assert.equal((button as HTMLButtonElement).disabled, true);
    fireEvent.click(button);
    assert.deepEqual(calls, [42]);
    assert.equal(opened, 0);
    finish();
    await waitFor(() => assert.equal((button as HTMLButtonElement).disabled, false));
    view.rerender(<TaskCard {...base} task={{ ...task, completed: true, status: "done" }} onToggle={onToggle} />);
    assert.equal(view.getByRole("button", { name: "Mark Review release incomplete" }).getAttribute("aria-pressed"), "true");
  } finally { cleanup(); }
});

test("completion circle supports keyboard activation", async () => {
  let toggled = 0;
  const view = render(<TaskCard {...base} onToggle={() => { toggled++; }} />);
  try {
    view.getByRole("button", { name: "Mark Review release complete" }).focus();
    await userEvent.keyboard("{Enter}");
    assert.equal(toggled, 1);
  } finally { cleanup(); }
});

test("unsaved task remains incomplete and can be retried", async () => {
  let attempts = 0;
  // Page handlers report failed requests and resolve without replacing task data.
  const view = render(<TaskCard {...base} onToggle={async () => { attempts++; }} />);
  try {
    const button = view.getByRole("button", { name: "Mark Review release complete" });
    await userEvent.click(button);
    await waitFor(() => assert.equal((button as HTMLButtonElement).disabled, false));
    assert.equal(button.getAttribute("aria-pressed"), "false");
    await userEvent.click(button);
    assert.equal(attempts, 2);
  } finally { cleanup(); }
});
