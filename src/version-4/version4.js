let queue = [];
const HOST = document.getElementById('app');

const render = (elements, dom) => {
    console.log(elements);

    const lol = new elements.nodeName;
    lol.props = elements.attributes;
    console.log(lol);

    queue = queue.concat({dom, attributes: elements.attributes, children: elements.children});
    requestIdleCallback(callback);
};

const callback = () => {
    while (queue.length) {
        let i = queue.length - 1;
        let newElement = createElkElement(queue[i].dom, queue[i].attributes, queue[i].children);
        let changedNewElement = renderElement(newElement);

        HOST.appendChild(changedNewElement);
        queue.splice(0, 1);
    }
};

const createElkElement = (nodeName, attributes, ...args) => {
    let children = args.length ? [].concat(...args) : null;
    return { nodeName, attributes, children };
};

const renderElement = (vnode) => {
    console.log(vnode);

    if (vnode.split) return document.createTextNode(vnode);

    if(HOST === vnode.nodeName) vnode.nodeName = document.createElement('div');

    let attributes = vnode.attributes || {};

    for (const keys of Object.keys(attributes)) {
        vnode.nodeName.setAttribute(keys, attributes[keys]);
    }

    for (const component of (vnode.children || [])) {
        if(component) vnode.nodeName.appendChild(renderElement(component));
    }

    return vnode.nodeName;
};

// -------------------------------------------------------------

export class ElkComponent {
    constructor(props) {
        this.props = props || {};
        this.state = this.state || {};
    }
}

/** @jsx createElkElement */

class Headline extends ElkComponent {
    render() {
        return <h1 className="headline">
            Initial Line
            <br />
            new line
        </h1>
    }
}

class HelloMessage extends ElkComponent {
    render() {
        return (
            <div>
                <Headline/>
                <p>Hello {this.props.name}</p>
            </div>
        );
    }
}

render(
    <HelloMessage name="Elliot Evans" is="section" />,
    document.getElementById("app")
);
