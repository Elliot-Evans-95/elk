const HOST = "ROOT";
const COMPONENT = "COMPONENT";
const TEXT = "TEXT";

const TIME_THRESHOLD = 16;

let ITEM_Of_WORK_EXISTS = false;
let IS_A_FIBER_ELEMENT_PENDING_COMMIT = false;

let PENDING_FIBER_ELEMENT = null;
let ITEM_OF_WORK = null;

let queue = [];

const render = (elements, dom) => {
    cancelIdleCallback(checkToDoWork);

    const elementToRender = {
        from: HOST,
        dom: dom,
        props: { children: elements }
    };

    queue = queue.concat(elementToRender);

    requestIdleCallback(checkToDoWork);
};

const checkToDoWork = (IdleDeadline) => {
    performWork(IdleDeadline.timeRemaining());

    if (ITEM_Of_WORK_EXISTS) {
        requestIdleCallback(checkToDoWork);
    } else {
        cancelIdleCallback(checkToDoWork);
    }
};

const performWork = (timeRemainingForBrowser) => {
    if (!ITEM_Of_WORK_EXISTS) {
        resetNextItemInQueue();
    }

    while(ITEM_Of_WORK_EXISTS && timeRemainingForBrowser > TIME_THRESHOLD) {
        unitOfWork(ITEM_OF_WORK);
    }

    if (IS_A_FIBER_ELEMENT_PENDING_COMMIT) {
        commitPendingFiberElement(PENDING_FIBER_ELEMENT);
        throw new Error;
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

    const root = latestRenderInQueue.from === HOST
        ? latestRenderInQueue.dom._rootContainerFiber
        : getRoot(latestRenderInQueue.instance.__fiber);

    ITEM_OF_WORK = {
        tag: HOST,
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
        default:
            console.log('NOT ROOT');
            createClassDOMElement(fiberInProgress);
            throw new Error;
            // break;
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

const createHostDOMElement = (fiberInProgress) => {
    if (!fiberInProgress.stateNode) {
        fiberInProgress.stateNode = createDomElement(fiberInProgress);
    }

    const childrenElements = fiberInProgress.props.children;
    diffChildrenArray(fiberInProgress, childrenElements);
};

const createDomElement = (fiber) => {
    console.log('CREATE DOM ELEMENT');

    const isTextElement = fiber.type === TEXT;
    const dom = isTextElement
        ? document.createTextNode("")
        : document.createElement(fiber.type);
    updateDomProperties(dom, [], fiber.props);

    return dom;
};

const updateDomProperties = (dom, prevProps, nextProps) => {
    console.log('UPDATE DOM PROPS');

    // Set attributes
    Object.keys(nextProps)
        // .filter(isAttribute)
        // .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            dom[name] = nextProps[name];
        });

    // Set style
    prevProps.style = prevProps.style || {};
    nextProps.style = nextProps.style || {};
    Object.keys(nextProps.style)
        // .filter(isNew(prevProps.style, nextProps.style))
        .forEach(key => {
            dom.style[key] = nextProps.style[key];
        });
    Object.keys(prevProps.style)
        // .filter(isGone(prevProps.style, nextProps.style))
        .forEach(key => {
            dom.style[key] = "";
        });

    // Add event listeners
    Object.keys(nextProps)
        // .filter(isEvent)
        // .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            const eventType = name.toLowerCase().substring(2);
            dom.addEventListener(eventType, nextProps[name]);
        });

};

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

    if(fiberInProgress.parent) {
        const childEffects = fiberInProgress.effects || [];
        const thisEffect = fiberInProgress.effectTag != null ? [fiberInProgress] : [];
        const parentEffects = fiberInProgress.parent.effects || [];
        fiberInProgress.parent.effects = parentEffects.concat(childEffects, thisEffect);
    } else {
        IS_A_FIBER_ELEMENT_PENDING_COMMIT = true;
        PENDING_FIBER_ELEMENT = {...fiberInProgress};
    }
};

const commitPendingFiberElement = (pendingFiberElement) => {
    if(pendingFiberElement.effects) {
        pendingFiberElement.effects.forEach(f => renderFiber(f));
    }

    pendingFiberElement.stateNode._rootContainerFiber = pendingFiberElement;

    // RESET
    ITEM_Of_WORK_EXISTS = false;
    ITEM_OF_WORK = null;
    IS_A_FIBER_ELEMENT_PENDING_COMMIT = false;
    PENDING_FIBER_ELEMENT = null;
    //

    throw new Error;
};

const renderFiber = (fiberElement) => {
    const domParent = fiberElement.stateNode;

    domParent.appendChild(fiberElement.child);

    throw new Error;
};

// -------------------

export const createElkElement = (type, config, ...args) => {
    const props = Object.assign({}, config);
    const hasChildren = args.length > 0;
    const rawChildren = hasChildren ? [].concat(...args) : [];

    props.children = rawChildren
        .filter(c => c != null && c !== false)
        .map(c => c instanceof Object ? c : createTextElement(c));

    return { type, props };
};

export class ElkComponent {
    constructor(props) {
        this.props = props || {};
        this.state = this.state || {};
    }
}

/** @jsx createElkElement */

// class Headline extends ElkComponent {
//     render() {
//         return <h1 className="headline">
//             Initial Line
//             <br />
//             new line
//         </h1>
//     }
// }

class HelloMessage extends ElkComponent {
    render() {
        return (
            <div>
                <p>Hello {this.props.name}</p>
            </div>
        );
    }
}

render(
    <HelloMessage name="Elliot Evans" />,
    document.getElementById("app")
);