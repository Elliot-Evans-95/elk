import elk from "./dom";
import {reRender} from "./reRender";

const initialSum = 5;

const callOtherStuff = () => {
    const button = document.getElementById('testClick');
    button.addEventListener('click', event => button.innerHTML = `Click count: ${event.detail}`);
};

const add = () => {
    return 1 + 2;
};

const addMore = (number: number) => {
    console.log('FIRE');
    return 1 + 2 + number;
};

function Hello(name: string, initialSum: number) {
    return (
        <div class="asd">
            First {name}
            <div> Hello Nested </div>
            <Bye name={"Byee"} cool={"text"} sum={initialSum} testfunc={add()}/>
        </div>
    );
}

function Bye(name: any, cool: string, sum: number, add: Function) {
    function fire(e) {
        console.log('FIRE', e);
        sum = 10;

        reRender(Bye.name, [{sum}]);
    }

    return (
        <div class="asd">
            {name} Ting
            <div> {cool} nahhh </div>
            <button id="testClick" click={fire}>Count</button>
            <mark> {sum} || {add} </mark>
        </div>
    );
}

function render(node: HTMLElement) {
    console.log(node);

    const app = document.getElementById("app");
    app.appendChild(node);

    callOtherStuff();
}

render(
    Hello("Component", initialSum)
);
