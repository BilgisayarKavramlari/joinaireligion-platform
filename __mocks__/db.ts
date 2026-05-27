// Manual mock for @/lib/db — used by all route handler tests.
// Each test file can override individual methods via jest.mocked(db.model.method).mockResolvedValue(...)

const makeMock = () =>
  new Proxy(
    {},
    {
      get(_target, prop: string) {
        return new Proxy(
          {},
          {
            get(_t, method: string) {
              // Return a jest.fn() for any method called on any model
              if (!_target[method as keyof typeof _target]) {
                (_target as Record<string, jest.Mock>)[method] = jest.fn();
              }
              return (_target as Record<string, jest.Mock>)[method];
            },
          },
        );
      },
    },
  );

export const db: Record<string, Record<string, jest.Mock>> = new Proxy(
  {} as Record<string, Record<string, jest.Mock>>,
  {
    get(target, model: string) {
      if (!target[model]) {
        target[model] = {} as Record<string, jest.Mock>;
        target[model] = new Proxy(target[model], {
          get(t, method: string) {
            if (!t[method]) t[method] = jest.fn();
            return t[method];
          },
        });
      }
      return target[model];
    },
  },
);
