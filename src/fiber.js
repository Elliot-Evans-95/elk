/** @format */

// SHIM
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

function importDidact() {

// CREATE ELEMENT
const TEXT_ELEMENT = "TEXT ELEMENT";

function createElement(type, config, ...args) {
    const props = Object.assign({}, config);
    const hasChildren = args.length > 0;
    const rawChildren = hasChildren ? [].concat(...args) : [];
    props.children = rawChildren
        .filter(c => c != null && c !== false)
        .map(c => c instanceof Object ? c : createTextElement(c));
    return { type, props };
}

function createTextElement(value) {
    return createElement(TEXT_ELEMENT, { nodeValue: value });
}

// DOM UTILS
const isEvent = name => name.startsWith("on");
const isAttribute = name => !isEvent(name) && name != "children" && name != "style";
const isNew = (prev, next) => key => prev[key] !== next[key];
const isGone = (prev, next) => key => !(key in next);

function updateDomProperties(dom, prevProps, nextProps) {
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
}

function createDomElement(fiber) {
    const isTextElement = fiber.type === TEXT_ELEMENT;
    const dom = isTextElement
        ? document.createTextNode("")
        : document.createElement(fiber.type);
    updateDomProperties(dom, [], fiber.props);
    return dom;
}

// COMPONENT
class Component {
    constructor(props) {
        this.props = props || {};
        this.state = this.state || {};
    }

    setState(partialState) {
        scheduleUpdate(this, partialState);
    }
}

// CREATE INSTANCE
function createInstance(fiber) {
    const instance = new fiber.type(fiber.props);
    instance.__fiber = fiber;

    return instance;
}

// Fiber tags
const HOST_COMPONENT = "host";
const CLASS_COMPONENT = "class";
const HOST_ROOT = "root";

// Global state
const updateQueue = [];
const ENOUGH_TIME = 1; // milliseconds
let nextUnitOfWork = null;
let pendingCommit = null;
// let workQueue = [];

// RENDER
function render2(elements, containerDom) {
    updateQueue.push({
        from: HOST_ROOT,
        dom: containerDom,
        newProps: { children: elements }
    });

    requestIdleCallback(performWork);
}

// SCHEDULE UPDATE
function scheduleUpdate(instance, partialState) {
    updateQueue.push({
        from: CLASS_COMPONENT,
        instance: instance,
        partialState: partialState
    });

    requestIdleCallback(performWork);
}

// PERFORM WORK
function performWork(deadline) {
    workLoop(deadline);

    if (nextUnitOfWork || updateQueue.length > 0) {
        requestIdleCallback(performWork);
    }
}

// WORK LOOP
function workLoop(deadline) {
    if (!nextUnitOfWork) {
        resetNextUnitOfWork();
    }
    while (nextUnitOfWork &&  deadline.timeRemaining() > ENOUGH_TIME) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    }
    if (pendingCommit) {
        commitAllWork(pendingCommit);
    }
}

// RESET NEXT UNIT OF WORK
function resetNextUnitOfWork() {
    const update = updateQueue.shift();

    if (!update) {
        return;
    }

    // Copy the setState parameter from the update payload to the corresponding fiber
    if (update.partialState) {
        update.instance.__fiber.partialState = update.partialState;
    }

    const root =
        update.from == HOST_ROOT
            ? update.dom._rootContainerFiber
            : getRoot(update.instance.__fiber);

    nextUnitOfWork = {
        tag: HOST_ROOT,
        stateNode: update.dom || root.stateNode,
        props: update.newProps || root.props,
        alternate: root
    };
}

// GET ROOT
function getRoot(fiber) {
    let node = fiber;

    while (node.parent) {
        node = node.parent;
    }

    return node;
}

// PERFORM UNIT OF WORK
function performUnitOfWork(wipFiber) {
    beginWork(wipFiber);

    if (wipFiber.child) {
        return wipFiber.child;
    }

    // No child, we call completeWork until we find a sibling
    let uow = wipFiber;

    while (uow) {
        completeWork(uow);
        if (uow.sibling) {
            // Sibling needs to beginWork
            return uow.sibling;
        }
        uow = uow.parent;
    }
}

// BEGIN WORK
function beginWork(wipFiber) {
    if (wipFiber.tag == CLASS_COMPONENT) {
        updateClassComponent(wipFiber);
    } else {
        updateHostComponent(wipFiber);
    }
}

// UPDATE HOST COMPONENT
function updateHostComponent(wipFiber) {
    if (!wipFiber.stateNode) {
        wipFiber.stateNode = createDomElement(wipFiber);
    }
    const newChildElements = wipFiber.props.children;
    reconcileChildrenArray(wipFiber, newChildElements);
}

// UPDATE CLASS COMPONENT
function updateClassComponent(wipFiber) {
    let instance = wipFiber.stateNode;

    if (instance == null) {
        // Call class constructor
        instance = wipFiber.stateNode = createInstance(wipFiber);
    } else if (wipFiber.props == instance.props && !wipFiber.partialState) {
        // No need to render2, clone children from last time
        cloneChildFibers(wipFiber);
        return;
    }

    instance.props = wipFiber.props;
    instance.state = Object.assign({}, instance.state, wipFiber.partialState);
    wipFiber.partialState = null;

    const newChildElements = wipFiber.stateNode.render2();
    reconcileChildrenArray(wipFiber, newChildElements);
}

// EFFECT TAGS
const PLACEMENT = 1;
const DELETION = 2;
const UPDATE = 3;

function arrify(val) {
    return val == null ? [] : Array.isArray(val) ? val : [val];
}

// RECONCILE CHILDREN ARRAY
function reconcileChildrenArray(wipFiber, newChildElements) {
    const elements = arrify(newChildElements);

    let index = 0;
    let oldFiber = wipFiber.alternate ? wipFiber.alternate.child : null;
    let newFiber = null;
    while (index < elements.length || oldFiber != null) {
        const prevFiber = newFiber;
        const element = index < elements.length && elements[index];
        const sameType = oldFiber && element && element.type == oldFiber.type;

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
                tag:
                    typeof element.type === "string" ? HOST_COMPONENT : CLASS_COMPONENT,
                props: element.props,
                parent: wipFiber,
                effectTag: PLACEMENT
            };
        }

        if (oldFiber && !sameType) {
            oldFiber.effectTag = DELETION;
            wipFiber.effects = wipFiber.effects || [];
            wipFiber.effects.push(oldFiber);
        }

        if (oldFiber) {
            oldFiber = oldFiber.sibling;
        }

        if (index == 0) {
            wipFiber.child = newFiber;
        } else if (prevFiber && element) {
            prevFiber.sibling = newFiber;
        }

        index++;
    }
}

// CLONE CHILD FIBERS
function cloneChildFibers(parentFiber) {
    const oldFiber = parentFiber.alternate;
    if (!oldFiber.child) {
        return;
    }

    let oldChild = oldFiber.child;
    let prevChild = null;
    while (oldChild) {
        const newChild = {
            type: oldChild.type,
            tag: oldChild.tag,
            stateNode: oldChild.stateNode,
            props: oldChild.props,
            partialState: oldChild.partialState,
            alternate: oldChild,
            parent: parentFiber
        };
        if (prevChild) {
            prevChild.sibling = newChild;
        } else {
            parentFiber.child = newChild;
        }
        prevChild = newChild;
        oldChild = oldChild.sibling;
    }
}

// COMPLETE WORK
function completeWork(fiber) {
    if (fiber.tag == CLASS_COMPONENT) {
        fiber.stateNode.__fiber = fiber;
    }

    if (fiber.parent) {
        const childEffects = fiber.effects || [];
        const thisEffect = fiber.effectTag != null ? [fiber] : [];
        const parentEffects = fiber.parent.effects || [];
        fiber.parent.effects = parentEffects.concat(childEffects, thisEffect);
    } else {
        pendingCommit = fiber;
    }
}

// COMMIT ALL WORK
function commitAllWork(fiber) {
    fiber.effects.forEach(f => commitWork(f));
    fiber.stateNode._rootContainerFiber = fiber;
    nextUnitOfWork = null;
    pendingCommit = null;
}

// COMMIT WORK
function commitWork(fiber) {
    if (fiber.tag == HOST_ROOT) {
        return;
    }

    let domParentFiber = fiber.parent;
    while (domParentFiber.tag == CLASS_COMPONENT) {
        domParentFiber = domParentFiber.parent;
    }
    const domParent = domParentFiber.stateNode;

    if (fiber.effectTag == PLACEMENT && fiber.tag == HOST_COMPONENT) {
        domParent.appendChild(fiber.stateNode);
    } else if (fiber.effectTag == UPDATE) {
        updateDomProperties(fiber.stateNode, fiber.alternate.props, fiber.props);
    } else if (fiber.effectTag == DELETION) {
        commitDeletion(fiber, domParent);
    }
}

// COMMIT DELETION
function commitDeletion(fiber, domParent) {
    let node = fiber;

    while (true) {
        if (node.tag == CLASS_COMPONENT) {
            node = node.child;
            continue;
        }
        domParent.removeChild(node.stateNode);
        while (node != fiber && !node.sibling) {
            node = node.parent;
        }
        if (node == fiber) {
            return;
        }
        node = node.sibling;
    }
}

    return {
        createElement,
        render2,
        Component
    };
}

/** @jsx Didact.createElement */
const Didact = importDidact();

class HelloMessage extends Didact.Component {
    render2() {
        return (
            <div>
                <Headline/>
                <p>Hello {this.props.name}</p>
            </div>
        );
    }
}

class Headline extends Didact.Component {
    render2() {
        return <h1 className="headline">
            Initial Line
            <br />
            new line
        </h1>
    }
}

Didact.render2(
    <HelloMessage name="John" />,
    document.getElementById("app")
);
