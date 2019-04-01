let rootInstance = null;

export const elk = (element: any, attrs: any, ...children: Array<string>) => {
    let currentInstance = null;

    switch (typeof element) {
        case 'function':
            currentInstance = functionType(element, attrs, children);
            break;
        case 'string':
            currentInstance = stringType(element, attrs, children);
            break;
        default:
            break;
    }

    rootInstance = currentInstance;

    return rootInstance;
};

const functionType = (element: any, attrs: any, children: Array<string>) => {
    console.log('functions children: ', children);

    const attrsArray = Object
        .keys(attrs)
        .map(key => attrs[key]);

    function dispatch(fn, args) {
        fn = (typeof fn == "function") ? fn : window[fn];
        return fn.apply(this, args || []);
    }

    return dispatch(element, attrsArray);
};

const stringType = (element: any, attrs: Array<any> = [], children: Array<string> = []) => {
    let dom = document.createElement(element);

    if(attrs === null || attrs === undefined)
        attrs = [];

    if(children === null || children === undefined)
        children = [];

    Object.keys(attrs).map(key => {
        const hoistedValue = attrs[key];

        if (key === "className") {
            key = 'class';
            attrs[key] = hoistedValue;
        }

        dom.setAttribute(key, attrs[key])
    });

    children.forEach(content => {
        if(content === null || content === undefined)
            return;

        if(typeof content === 'object') {
            dom.appendChild(content);
        } else {
            dom.textContent += content;
        }

    });

    return dom;
};

export default elk;
