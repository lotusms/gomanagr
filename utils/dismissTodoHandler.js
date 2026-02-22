import { dismissTodo } from '@/services/userService';

/**
 * Creates a handler for dismissing a todo. Call from dashboard and team-member pages
 * so the flow (dismissTodo + state update) is maintained in one place.
 *
 * @param {Object} options
 * @param {string} [options.userId] - Current user id (e.g. currentUser?.uid)
 * @param {Array<string>} [options.dismissedTodoIds] - Current dismissed todo ids
 * @param {Function} options.onSuccess - Called with the new dismissed ids: (next: string[]) => void
 * @returns {(todoId: string) => void} Handler to pass to DashboardTodos onDismiss
 */
export function createDismissTodoHandler({ userId, dismissedTodoIds, onSuccess }) {
  return (todoId) => {
    dismissTodo(userId, todoId, dismissedTodoIds)
      .then((next) => {
        if (next != null) onSuccess(next);
      })
      .catch((err) => console.error('Failed to dismiss todo:', err));
  };
}
