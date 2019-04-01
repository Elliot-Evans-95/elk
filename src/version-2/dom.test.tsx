import elk from "./dom";

const mockSmallHTML = () => {
    return (
        <div>Hello Nested</div>
    );
};

describe('example test', () => {
    test('that the elk render works', () => {
        expect(mockSmallHTML()).toEqual("<div >Hello Nested</div>");
    })
});
