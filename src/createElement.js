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
