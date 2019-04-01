import elk from "./dom";

function Hello(name: string) {
    return (
        <div className="asd">
            First {name}
            <div> Hello Nested </div>
            <Bye name={"Byee"} cool={"text"}/>
        </div>
    );
}

function Bye(name: any, cool: string) {
    return (
        <div className="asd">
            {name} Ting
            <div> {cool} nahhh </div>
        </div>
    );
}

function render(node: any) {
    console.log(node);

    const app = document.getElementById("app");
    app.appendChild(node);
}

render(
    Hello("Component")
);
