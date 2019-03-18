/** @format */

window.requestIdleCallback = window.requestIdleCallback || function(handler) {
    let startTime = Date.now();

    return setTimeout(function() {
        handler({
            didTimeout: false,
            timeRemaining: function() {
                return Math.max(0, 50.0 - (Date.now() - startTime));
            }
        });
    }, 1);
};
window.cancelIdleCallback = window.cancelIdleCallback || function(id) {
    clearTimeout(id);
};

const ENOUGH_TIME = 1;
const HOST_COMPONENT = "host";
const TEXT_ELEMENT = "TEXT ELEMENT";
const CLASS_COMPONENT = "class";
const HOST_ROOT = "ROOT";
const PLACEMENT = 1;
const UPDATE = 3;

const queue = [];

let unitOfWork = null;
let pendingCommit = null;

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
const isEvent = name => name.startsWith("on");
const isAttribute = name => !isEvent(name) && name !== "children" && name !== "style";
const isNew = (prev, next) => key => prev[key] !== next[key];
const isGone = (prev, next) => key => !(key in next);
const makeArray = (val) => val == null ? [] : Array.isArray(val) ? val : [val];
const updateDomProperties = (dom, prevProps, nextProps) => {
    console.log('UPDATE DOM PROPS');

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
const createDomElement = (fiber) => {
    console.log('CREATE DOM ELEMENT');

    const isTextElement = fiber.type === TEXT_ELEMENT;
    const dom = isTextElement
        ? document.createTextNode("")
        : document.createElement(fiber.type);
    updateDomProperties(dom, [], fiber.props);

    return dom;
};


// 1
export const renderElk = (elements, containerDom) => {
    console.log('START THE RENDER PROCESS');

    queue.push({
        from: HOST_ROOT,
        dom: containerDom,
        props: { children: elements }
    });

    requestIdleCallback(performWork);
};

// 2
const performWork = (deadline) =>  {
    console.log('PERFORM WORK');

    // workLoop(deadline);
    //
    // // If there is something else to do then call itself
    // if (unitOfWork || queue.length > 0) {
    //     requestIdleCallback(performWork);
    // }

    // If there is something else to do then call itself
    if (!unitOfWork) {
        workLoop(deadline);
    } else {
        requestIdleCallback(performWork);
    }
};

const performUnitOfWork = (wipFiber) => {
    console.log('PERFORM UNIT OF WORK');

    beginWork(wipFiber);

    if (wipFiber.child) {
        return wipFiber.child;
    }


    // ---------- not sure what below does

    // No child then we call completeWork until we find a sibling
    let unitOfWork = wipFiber;

    while (unitOfWork) {
        completeWork(unitOfWork);
        if (unitOfWork.sibling) {
            // Sibling needs to beginWork
            return unitOfWork.sibling;
        }
        unitOfWork = unitOfWork.parent;
    }
};

// 3
const workLoop = (deadline) => {
    console.log('START THE WORK LOOP');

    // If the next item in queue does not exist then reset the queue
    if (!unitOfWork) {
        resetNextUnitOfWork();
    }

    while (unitOfWork && deadline.timeRemaining() > ENOUGH_TIME) {
        unitOfWork = performUnitOfWork(unitOfWork);
    }

    if (pendingCommit) {
        commitAllWork(pendingCommit);
    }
};

// 4
const resetNextUnitOfWork = () => {
    console.log('RESET WORK QUEUE');

    const update = queue.shift();

    if (!update) {
        return;
    }

    const root = update.from === HOST_ROOT ? update.dom._rootContainerFiber : update.dom._rootContainerFiber;

    // CREATES THE UNIT OF WORK
    unitOfWork = {
        tag: HOST_ROOT,
        stateNode: update.dom || root.stateNode,
        props: update.props || root.props,
        alternate: root
    };
};

// 5
const beginWork = (wipFiber) => {
    console.log('BEGIN WORK');

    if (wipFiber.tag === CLASS_COMPONENT) {
        updateClassComponent(wipFiber);
    } else {
        updateHostComponent(wipFiber);
    }
};

// 6
const updateHostComponent = (wipFiber) => {
    console.log('UPDATE HOST COMPONENT');

    if (!wipFiber.stateNode) {
        wipFiber.stateNode = createDomElement(wipFiber);
    }

    const newChildElements = wipFiber.props.children;
    reconcileChildrenArray(wipFiber, newChildElements);
};

// 7
const reconcileChildrenArray = (wipFiber, newChildElements) => {
    console.log('RECONCILE CHILDREN ARRAY');

    const elements = makeArray(newChildElements);

    let index = 0;
    let oldFiber = wipFiber.alternate ? wipFiber.alternate.child : null;
    let newFiber = null;
    while (index < elements.length || oldFiber != null) {
        const prevFiber = newFiber;
        const element = index < elements.length && elements[index];

        // Is the element the same type as the previous element
        const sameType = oldFiber && element && element.type === oldFiber.type;

        if (sameType) {
            newFiber = {
                type: oldFiber.type,
                tag: oldFiber.tag,
                stateNode: oldFiber.stateNode,
                props: element.props,
                parent: wipFiber,
                alternate: oldFiber,
                partialState: oldFiber.partialState,
                effectTag: UPDATE
            };
        }

        if (element && !sameType) {

            newFiber = {
                type: element.type,
                tag: typeof element.type === "string" ? HOST_COMPONENT : CLASS_COMPONENT,
                props: element.props,
                parent: wipFiber,
                effectTag: PLACEMENT
            };
        }

        if (oldFiber) {
            oldFiber = oldFiber.sibling;
        }

        if (index === 0) {
            wipFiber.child = newFiber;
        } else if (prevFiber && element) {
            prevFiber.sibling = newFiber;
        }

        index++;
    }
};

// UPDATE CLASS COMPONENT
const updateClassComponent = (wipFiber) => {
    let instance = wipFiber.stateNode;

    if (instance == null) {
        // Call class constructor
        instance = wipFiber.stateNode = createInstance(wipFiber);
    } else if (wipFiber.props === instance.props && !wipFiber.partialState) {
        // No need to render, clone children from last time
        // cloneChildFibers(wipFiber);
        return;
    }

    instance.props = wipFiber.props;
    instance.state = Object.assign({}, instance.state, wipFiber.partialState);
    wipFiber.partialState = null;

    const newChildElements = wipFiber.stateNode.renderElk();
    reconcileChildrenArray(wipFiber, newChildElements);
};

const createInstance = (fiber) => {
    // Class constructor needs to be invoked with 'new'
    const instance = new fiber.type(fiber.props);

    instance.__fiber = fiber;

    return instance;
};

// 8
const completeWork = (fiber) => {
    console.log('ALL WORK HAS COMPLETED');

    if (fiber.tag === CLASS_COMPONENT) {
        fiber.stateNode.__fiber = fiber;
    }

    console.log(fiber.parent);

    if (fiber.parent) {
        const childEffects = fiber.effects || [];
        const thisEffect = fiber.effectTag != null ? [fiber] : [];
        const parentEffects = fiber.parent.effects || [];
        fiber.parent.effects = parentEffects.concat(childEffects, thisEffect);
    } else {
        pendingCommit = fiber;
    }
};

// 9
const commitAllWork = (fiber) => {
    console.log('CALL TO LAST');

    fiber.effects.forEach(f => commitWork(f));
    fiber.stateNode._rootContainerFiber = fiber;
    unitOfWork = null;
    pendingCommit = null;
};

// 10
const commitWork = (fiber) => {
    console.log('LAST');

    if (fiber.tag === HOST_ROOT) {
        return;
    }

    let domParentFiber = fiber.parent;
    while (domParentFiber.tag === CLASS_COMPONENT) {
        domParentFiber = domParentFiber.parent;
    }
    const domParent = domParentFiber.stateNode;

    if (fiber.effectTag === PLACEMENT && fiber.tag === HOST_COMPONENT) {
        domParent.appendChild(fiber.stateNode);
    } else if (fiber.effectTag === UPDATE) {
        updateDomProperties(fiber.stateNode, fiber.alternate.props, fiber.props);
    }

};

// COMPONENT
export class ElkComponent {
    constructor(props) {
        this.props = props || {};
        this.state = this.state || {};
    }
}

/** @jsx createElkElement */

// class Headline extends ElkComponent {
//     renderElk() {
//         return <h1 className="headline">
//             Initial Line
//             <br />
//             new line
//         </h1>
//     }
// }

class HelloMessage extends ElkComponent {
    renderElk() {
        return (
            <div>
                <p>Hello {this.props.name}</p>
            </div>
        );
    }
}

renderElk(
    <HelloMessage name="Elliot Evans" />,
    document.getElementById("app")
);