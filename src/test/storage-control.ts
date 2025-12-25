let resetEnabled = true;

/** Toggle whether localStorage is cleared after each test run. Default: true. */
export function setResetLocalStorageAfterEach(enable: boolean) {
    resetEnabled = enable;
}

export function shouldResetLocalStorageAfterEach() {
    return resetEnabled;
}
