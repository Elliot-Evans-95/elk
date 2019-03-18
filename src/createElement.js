/** @format */

//  --- use memorization to increase perf ---
// import memoize from 'fast-memoize';

export const elkCreateElement = (tag, attrs, children) => {
	if (tag === null) {
		return;
	}

	if (typeof tag === 'function') {
		return tag();
	}

	const element = document.createElement(tag);
	const fragments = document.createDocumentFragment();

	if (attrs !== null) {
		const attrsLength = attrs.length;

		for (let name = 0; name < attrsLength; name++) {
			if (name && attrs.hasOwnProperty(name)) {
				let value = attrs[name];
				if (value === true) {
					element.setAttribute(name, name);
				} else if (value !== false && value != null) {
					element.setAttribute(name, value.toString());
				}
			}
		}
	}

	if (children !== null) {
		if (typeof children === 'string') {
			element.appendChild(
				children.nodeType == null // Falsy on purpose
					? document.createTextNode(children)
					: document.createTextNode('')
			);
		}

		if (typeof children === 'object') {
			const childrenLength = children.length;

			for (let child = 0; child < childrenLength; child++) {
				if (children[child] instanceof HTMLElement) {
					fragments.appendChild(children[child]);
				} else if (typeof children[child] === 'string') {
					const textnode = document.createTextNode(children[child]);
					fragments.appendChild(textnode);
				} else {
					console.log('not appendable', child);
				}
			}
		}
	}

	element.appendChild(fragments);

	return element;
};

export const elkCreateElement2 = (type, props, ...children) => {
	if (props === null) props = {};
	return {type, props, children};
};

export const elkRender = (vdom, parent=null) => {
	const mount = parent ? (el => parent.appendChild(el)) : (el => el);
	if (typeof vdom == 'string' || typeof vdom == 'number') {
		return mount(document.createTextNode(vdom));
	} else if (typeof vdom == 'boolean' || vdom === null) {
		return mount(document.createTextNode(''));
	} else if (typeof vdom == 'object' && typeof vdom.type == 'function') {
		return Component.render(vdom, parent);
	} else if (typeof vdom == 'object' && typeof vdom.type == 'string') {
		const dom = mount(document.createElement(vdom.type));
		for (const child of [/* flatten */].concat(...vdom.children))
			render(child, dom);
		for (const prop in vdom.props)
			setAttribute(dom, prop, vdom.props[prop]);
		return dom;
	} else {
		throw new Error(`Invalid VDOM: ${vdom}.`);
	}
};

export const elkSetAttribute = (dom, key, value) => {
	if (typeof value == 'function' && key.startsWith('on')) {
		const eventType = key.slice(2).toLowerCase();
		dom.__gooactHandlers = dom.__gooactHandlers || {};
		dom.removeEventListener(eventType, dom.__gooactHandlers[eventType]);
		dom.__gooactHandlers[eventType] = value;
		dom.addEventListener(eventType, dom.__gooactHandlers[eventType]);
	} else if (key == 'checked' || key == 'value' || key == 'className') {
		dom[key] = value;
	} else if (key == 'style' && typeof value == 'object') {
		Object.assign(dom.style, value);
	} else if (key == 'ref' && typeof value == 'function') {
		value(dom);
	} else if (key == 'key') {
		dom.__gooactKey = value;
	} else if (typeof value != 'object' && typeof value != 'function') {
		dom.setAttribute(key, value);
	}
};

export const elkPatch = (dom, vdom, parent=dom.parentNode) => {
	const replace = parent ? el => (parent.replaceChild(el, dom) && el) : (el => el);
	if (typeof vdom == 'object' && typeof vdom.type == 'function') {
		return Component.patch(dom, vdom, parent);
	} else if (typeof vdom != 'object' && dom instanceof Text) {
		return dom.textContent != vdom ? replace(render(vdom, parent)) : dom;
	} else if (typeof vdom == 'object' && dom instanceof Text) {
		return replace(render(vdom, parent));
	} else if (typeof vdom == 'object' && dom.nodeName != vdom.type.toUpperCase()) {
		return replace(render(vdom, parent));
	} else if (typeof vdom == 'object' && dom.nodeName == vdom.type.toUpperCase()) {
		const pool = {};
		const active = document.activeElement;
		[/* flatten */].concat(...dom.childNodes).map((child, index) => {
			const key = child.__gooactKey || `__index_${index}`;
			pool[key] = child;
		});
		[/* flatten */].concat(...vdom.children).map((child, index) => {
			const key = child.props && child.props.key || `__index_${index}`;
			dom.appendChild(pool[key] ? patch(pool[key], child) : render(child, dom));
			delete pool[key];
		});
		for (const key in pool) {
			const instance = pool[key].__gooactInstance;
			if (instance) instance.componentWillUnmount();
			pool[key].remove();
		}
		for (const attr of dom.attributes) dom.removeAttribute(attr.name);
		for (const prop in vdom.props) setAttribute(dom, prop, vdom.props[prop]);
		active.focus();
		return dom;
	}
};


class FilberComponent {
	constructor(props) {
		this.props = props || {};
		this.state = this.state || {};
	}

	setState(partialState) {
		scheduleUpdate(this, partialState);
	}
}

// function createInstance(fiber) {
// 	const instance = new fiber.type(fiber.props);
// 	instance.__fiber = fiber;
// 	return instance;
// }

class Component {
	constructor(props) {
		this.props = props || {};
		this.state = null;
	}

	static render(vdom, parent=null) {
		const props = Object.assign({}, vdom.props, {children: vdom.children});
		if (Component.isPrototypeOf(vdom.type)) {
			const instance = new (vdom.type)(props);
			instance.componentWillMount();
			instance.base = render(instance.render(), parent);
			instance.base.__gooactInstance = instance;
			instance.base.__gooactKey = vdom.props.key;
			instance.componentDidMount();
			return instance.base;
		} else {
			return render(vdom.type(props), parent);
		}
	}

	static patch(dom, vdom, parent=dom.parentNode) {
		const props = Object.assign({}, vdom.props, {children: vdom.children});
		if (dom.__gooactInstance && dom.__gooactInstance.constructor == vdom.type) {
			dom.__gooactInstance.componentWillReceiveProps(props);
			dom.__gooactInstance.props = props;
			return patch(dom, dom.__gooactInstance.render(), parent);
		} else if (Component.isPrototypeOf(vdom.type)) {
			const ndom = Component.render(vdom, parent);
			return parent ? (parent.replaceChild(ndom, dom) && ndom) : (ndom);
		} else if (!Component.isPrototypeOf(vdom.type)) {
			return patch(dom, vdom.type(props), parent);
		}
	}

	setState(nextState) {
		if (this.base && this.shouldComponentUpdate(this.props, nextState)) {
			const prevState = this.state;
			this.componentWillUpdate(this.props, nextState);
			this.state = nextState;
			patch(this.base, this.render());
			this.componentDidUpdate(this.props, prevState);
		} else {
			this.state = nextState;
		}
	}

	shouldComponentUpdate(nextProps, nextState) {
		return nextProps != this.props || nextState != this.state;
	}

	componentWillReceiveProps(nextProps) {
		return undefined;
	}

	componentWillUpdate(nextProps, nextState) {
		return undefined;
	}

	componentDidUpdate(prevProps, prevState) {
		return undefined;
	}

	componentWillMount() {
		return undefined;
	}

	componentDidMount() {
		return undefined;
	}

	componentWillUnmount() {
		return undefined;
	}
}


// Fiber tags
const HOST_COMPONENT = "host";
const CLASS_COMPONENT = "class";
const HOST_ROOT = "root";

// Global state
const updateQueue = [];
let nextUnitOfWork = null;
let pendingCommit = null;

function render(elements, containerDom) {
	updateQueue.push({
		from: HOST_ROOT,
		dom: containerDom,
		props: { children: elements }
	});
	requestIdleCallback(performWork);
}

function scheduleUpdate(instance, partialState) {
	updateQueue.push({
		from: CLASS_COMPONENT,
		instance: instance,
		partialState: partialState
	});
	requestIdleCallback(performWork);
}

const ENOUGH_TIME = 1; // milliseconds

function performWork(deadline) {
	workLoop(deadline);
	if (nextUnitOfWork || updateQueue.length > 0) {
		requestIdleCallback(performWork);
	}
}

function workLoop(deadline) {
	if (!nextUnitOfWork) {
		resetNextUnitOfWork();
	}
	while (nextUnitOfWork && deadline.timeRemaining() > ENOUGH_TIME) {
		nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
	}
	if (pendingCommit) {
		commitAllWork(pendingCommit);
	}
}