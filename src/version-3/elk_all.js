const ROOT = "ROOT";
const HOST = "HOST";
const COMPONENT = "COMPONENT";
const TEXT_ELEMENT = "TEXT";

const TIME_THRESHOLD = 16;

let ITEM_Of_WORK_EXISTS = false;
let IS_A_FIBER_ELEMENT_PENDING_COMMIT = false;

let PENDING_FIBER_ELEMENT = null;
let ITEM_OF_WORK = null;

let queue = [];
let newFiber = null;

const render = (elements, dom) => {
    const elementToRender = {
        from: HOST,
        dom: dom,
        props: { children: elements }
    };

    queue = queue.concat(elementToRender);

    requestIdleCallback(checkToDoWork);
};

const checkToDoWork = (idleDeadline) => {
    if(!PENDING_FIBER_ELEMENT) {
        getFiberToRender();
    } else {
        requestIdleCallback(checkToDoWork);
    }

    while(PENDING_FIBER_ELEMENT && idleDeadline.timeRemaining() > TIME_THRESHOLD) {
        const childrenElements = PENDING_FIBER_ELEMENT.props.children;
        const makeArray = (val) => val == null ? [] : Array.isArray(val) ? val : [val];
        const childElementsArray = makeArray(childrenElements);

        let i = 0;

        while (i < childElementsArray.length)  {
            const element = i < childElementsArray.length && childElementsArray[i];

            newFiber = {
                type: element.type,
                tag: typeof element.type === "string" ? HOST : COMPONENT,
                props: element.props,
                parent: PENDING_FIBER_ELEMENT,
                effectTag: 'PLACEMENT'
            };

            if (i === 0) {
                PENDING_FIBER_ELEMENT.child = newFiber;
            }

            i++;
        }


    }

    if(newFiber) {
        if (PENDING_FIBER_ELEMENT.tag === ROOT) {
            console.log('ROOT COMPONENT');
            return;
        } else {
            const domParent = PENDING_FIBER_ELEMENT.parent;
            domParent.appendChild(PENDING_FIBER_ELEMENT.stateNode);
        }

        PENDING_FIBER_ELEMENT = null;
        newFiber = null;
    }

};

const getFiberToRender = () => {
    if(queue.length === 0) return;

    const fiberToRender = queue.shift();
    const root = fiberToRender.from === ROOT ? fiberToRender.dom._rootContainerFiber : fiberToRender.dom._rootContainerFiber;

    PENDING_FIBER_ELEMENT = {
        tag: ROOT,
        stateNode: fiberToRender.dom || root.stateNode,
        props: fiberToRender.props || root.props,
        alternate: root
    };
};



//-------------

// const render = (elements, dom) => {
//     cancelIdleCallback(checkToDoWork);
//
//     const elementToRender = {
//         from: HOST,
//         dom: dom,
//         props: { children: elements }
//     };
//
//     queue = queue.concat(elementToRender);
//
//     requestIdleCallback(checkToDoWork);
// };

// const checkToDoWork = (IdleDeadline) => performWork(IdleDeadline.timeRemaining());

const performWork = (timeRemainingForBrowser) => {
    if (!ITEM_Of_WORK_EXISTS) {
        requestIdleCallback(checkToDoWork);
        resetNextItemInQueue();
    } else {
        cancelIdleCallback(checkToDoWork);
    }

    while(ITEM_Of_WORK_EXISTS && timeRemainingForBrowser > TIME_THRESHOLD) {
        unitOfWork(ITEM_OF_WORK);

        if (IS_A_FIBER_ELEMENT_PENDING_COMMIT) {
            commitPendingFiberElement(PENDING_FIBER_ELEMENT);
        }
    }
};

const resetNextItemInQueue = () => {
    if (queue.length === 0) {
        return;
    }

    const latestRenderInQueue = queue[0];

    if (latestRenderInQueue.partialState) {
        latestRenderInQueue.instance.__fiber.partialState = latestRenderInQueue.partialState;
    }

    // const root = latestRenderInQueue.from === ROOT
    //     ? latestRenderInQueue.dom._rootContainerFiber
    //     : getRoot(latestRenderInQueue.instance.__fiber);

    const root = latestRenderInQueue.from === ROOT
        ? latestRenderInQueue.dom._rootContainerFiber
        : null;

    ITEM_OF_WORK = {
        tag: ROOT,
        stateNode: latestRenderInQueue.dom || root.stateNode,
        props: latestRenderInQueue.props || root.props,
        alternate: root
    };
    ITEM_Of_WORK_EXISTS = true;
};

const getRoot = (fiber) => {
    let node = fiber;

    while (node.parent) {
        node = node.parent;
    }

    return node;
};

const unitOfWork = (fiberInProgress) => {
    startWorkload(fiberInProgress);

    while (fiberInProgress) {
        completeAUnitOfWork(fiberInProgress);

        if (fiberInProgress.sibling) {
            return fiberInProgress.sibling;
        }

        fiberInProgress = fiberInProgress.parent;
    }
};

const startWorkload = (fiberInProgress) => {
    switch (fiberInProgress.tag) {
        case 'ROOT':
            console.log('ROOT');
            createHostDOMElement(fiberInProgress);
            break;
        case 'COMPONENT':
            console.log('COMPONENT');
            createClassDOMElement(fiberInProgress);
            break;
        default:
            console.log('NO');
            break;
    }
};

const createClassDOMElement = (fiberInProgress) => {
    let instance = fiberInProgress.stateNode;

    if (instance == null) {
        instance = fiberInProgress.stateNode = createInstance(fiberInProgress);
    } else if (fiberInProgress.props === instance.props && !fiberInProgress.partialState) {
        return;
    }

    instance.props = fiberInProgress.props;
    instance.state = Object.assign({}, instance.state, fiberInProgress.partialState);
    fiberInProgress.partialState = null;

    const newChildElements = fiberInProgress.stateNode.renderElk();
    diffChildrenArray(fiberInProgress, newChildElements);
};

const createInstance = (fiber) => {
    const instance = new fiber.type(fiber.props);
    instance.__fiber = fiber;

    return instance;
};

const createHostDOMElement = (fiberInProgress) => {
    if (!fiberInProgress.stateNode) {
        fiberInProgress.stateNode = createDomElement(fiberInProgress);
    }

    const childrenElements = fiberInProgress.props.children;
    diffChildrenArray(fiberInProgress, childrenElements);
};

const createDomElement = (fiber) => document.createElement(fiber.type);

const diffChildrenArray = (fiberInProgress, childrenElements) => {
    const makeArray = (val) => val == null ? [] : Array.isArray(val) ? val : [val];
    const childElementsArray = makeArray(childrenElements);

    let i = 0;
    let newFiber = null;

    while (i < childElementsArray.length)  {
        const element = i < childElementsArray.length && childElementsArray[i];

        newFiber = {
            type: element.type,
            tag: typeof element.type === "string" ? HOST : COMPONENT,
            props: element.props,
            parent: fiberInProgress,
            effectTag: 'PLACEMENT'
        };

        if (i === 0) {
            fiberInProgress.child = newFiber;
        }

        i++;
    }

};

const completeAUnitOfWork = (fiberInProgress) => {
    if (fiberInProgress.tag === COMPONENT) {
        fiberInProgress.stateNode.__fiber = fiberInProgress;
    }

    IS_A_FIBER_ELEMENT_PENDING_COMMIT = true;
    PENDING_FIBER_ELEMENT = {...fiberInProgress};
};

const commitPendingFiberElement = (PENDING_FIBER_ELEMENT) => {
    renderFiber(PENDING_FIBER_ELEMENT);
    reset();
};

const reset = () => {
    ITEM_Of_WORK_EXISTS = false;
    ITEM_OF_WORK = null;
    IS_A_FIBER_ELEMENT_PENDING_COMMIT = false;
    PENDING_FIBER_ELEMENT = null;
};

const renderFiber = (fiberElement) => {
    console.log(fiberElement);

    if (fiberElement.tag === ROOT) return;

    const domParent = fiberElement.stateNode;

    if(fiberElement.tag === HOST) {
        domParent.appendChild(fiberElement.child);
    } else {
        updateDomProperties(fiberElement.stateNode, fiberElement.alternate.props, fiberElement.props);
    }
};

const updateDomProperties = (dom, prevProps, nextProps) => {
    // Remove event listeners
    Object.keys(prevProps)
        .filter(isEvent)
        .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
        .forEach(name => {
            const eventType = name.toLowerCase().substring(2);
            dom.removeEventListener(eventType, prevProps[name]);
        });

    // Remove attributes
    Object.keys(prevProps)
        .filter(isAttribute)
        .filter(isGone(prevProps, nextProps))
        .forEach(name => {
            dom[name] = null;
        });

    // Set attributes
    Object.keys(nextProps)
        .filter(isAttribute)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            dom[name] = nextProps[name];
        });

    // Set style
    prevProps.style = prevProps.style || {};
    nextProps.style = nextProps.style || {};
    Object.keys(nextProps.style)
        .filter(isNew(prevProps.style, nextProps.style))
        .forEach(key => {
            dom.style[key] = nextProps.style[key];
        });
    Object.keys(prevProps.style)
        .filter(isGone(prevProps.style, nextProps.style))
        .forEach(key => {
            dom.style[key] = "";
        });

    // Add event listeners
    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            const eventType = name.toLowerCase().substring(2);
            dom.addEventListener(eventType, nextProps[name]);
        });
};

// -------------------------------------------------------------

export const createElkElement = (type, config, ...args) => {
    const props = Object.assign({}, config);
    const hasChildren = args.length > 0;
    const rawChildren = hasChildren ? [].concat(...args) : [];

    props.children = rawChildren
        .filter(c => c != null && c !== false)
        .map(c => c instanceof Object ? c : createTextElement(c));

    return { type, props };
};

const createTextElement = (value) => createElkElement(TEXT_ELEMENT, {nodeValue: value});

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
    <HelloMessage name="Elliot Evans" />,
    document.getElementById("app")
);
