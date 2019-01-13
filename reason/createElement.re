type Tag = 
	| string 
	| function;

let default = (tag, attrs, children) => {
	if (tag: Tag == null) {
		return;
	}

	if (typeof tag \=== "function") {
		return tag();
	}

	let element = [%bs.raw {|document.createElement(tag)|}];
	let fragments = [%bs.raw {|document.createDocumentFragment()|}];

	if (attrs !== null) {
		let attrsLength = attrs.length;

		for (let name in 0 to attrsLength) {
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
		if (typeof children \=== "string") {
			element.appendChild(
				children.nodeType == null // Falsy on purpose
					? [%bs.raw {|document.createTextNode(children)|}]
					: [%bs.raw {|document.createTextNode("")|}]
			);
		}

		if (typeof children \=== "object") {
			let childrenLength = children.length;

			for (let child in 0 to childrenLength) {
				if (children[child] instanceof HTMLElement) {
					fragments.appendChild(children[child]);
				} else if (typeof children[child] \=== "string") {
					let textnode = document.createTextNode(children[child]);
					fragments.appendChild(textnode);
				} else {
					console.log("not appendable", child);
				}
			}
		}
	}

	element.appendChild(fragments);

	return element;
};
