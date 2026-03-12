/**
 * Unit tests for utils/dismissTodoHandler.js: createDismissTodoHandler
 */
import { createDismissTodoHandler } from '@/utils/dismissTodoHandler';

const mockDismissTodo = jest.fn();

jest.mock('@/services/userService', () => ({
  dismissTodo: (...args) => mockDismissTodo(...args),
}));

describe('dismissTodoHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns a function', () => {
    const handler = createDismissTodoHandler({ userId: 'u1', dismissedTodoIds: [], onSuccess: () => {} });
    expect(typeof handler).toBe('function');
  });

  it('calls dismissTodo with userId, todoId, dismissedTodoIds', () => {
    mockDismissTodo.mockResolvedValue(['t1']);
    const onSuccess = jest.fn();
    const handler = createDismissTodoHandler({
      userId: 'u1',
      dismissedTodoIds: [],
      onSuccess,
    });
    handler('todo-1');
    return Promise.resolve().then(() => {
      expect(mockDismissTodo).toHaveBeenCalledWith('u1', 'todo-1', []);
      expect(onSuccess).toHaveBeenCalledWith(['t1']);
    });
  });

  it('calls onSuccess with next when dismissTodo resolves to non-null', async () => {
    mockDismissTodo.mockResolvedValue(['t1', 't2']);
    const onSuccess = jest.fn();
    const handler = createDismissTodoHandler({ userId: 'u1', dismissedTodoIds: ['t1'], onSuccess });
    handler('t2');
    await new Promise((r) => setTimeout(r, 0));
    expect(onSuccess).toHaveBeenCalledWith(['t1', 't2']);
  });

  it('does not call onSuccess when dismissTodo resolves to null', async () => {
    mockDismissTodo.mockResolvedValue(null);
    const onSuccess = jest.fn();
    const handler = createDismissTodoHandler({ userId: 'u1', dismissedTodoIds: [], onSuccess });
    handler('t1');
    await new Promise((r) => setTimeout(r, 0));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('logs error when dismissTodo rejects', async () => {
    mockDismissTodo.mockRejectedValue(new Error('Network error'));
    const onSuccess = jest.fn();
    const handler = createDismissTodoHandler({ userId: 'u1', dismissedTodoIds: [], onSuccess });
    handler('t1');
    await new Promise((r) => setTimeout(r, 0));
    expect(console.error).toHaveBeenCalledWith('Failed to dismiss todo:', expect.any(Error));
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
