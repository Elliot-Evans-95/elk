import elk from "./dom";

function Hello(name: string) {
    return (
        <div className="asd">
            Hello {name}
            <div> Hello Nested </div>
            {Bye("byee")}
        </div>
    );
}

function Bye(name: string) {
    return (
        <div className="asd">
            {name} World
            <div> {name} Nested </div>
        </div>
    );
}

function render(html: string) {
    const range = document.createRange();
    const app = document.getElementById("app");

    range.selectNode(app);
    const documentFragment = range.createContextualFragment(html);

    app.appendChild(documentFragment);
}

render(
    Hello("World")
);
