// Promise-based mutex to serialize state mutations across concurrent socket events.
export function createSocketMutex(): RunExclusive {
    let last: Promise<void> = Promise.resolve();

    return <T>(fn: () => Promise<T> | T): Promise<T> => {
        const run = last.then(fn);
        last = run.then(() => undefined, () => undefined);
        return run;
    };
}
export function pp(obj: any): string{
    return JSON.stringify(obj, null, '\t');
}