export function foobar(data: object) {
    function onChange(e: React.ChangeEvent<HTMLInputElement>) {
        console.clear();
        console.log(data);
    }

    function foobar2() {
        return `foobar2: ${JSON.stringify(data)}`;
    }

    return onChange ;
}