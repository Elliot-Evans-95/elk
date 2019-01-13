/** @format */

{/*function notReact(tag, attrs, ...children) {*/}
	{/*if (tag === null) {*/}
		{/*return;*/}
	{/*}*/}

	{/*if (typeof tag === 'function') {*/}
		{/*return tag();*/}
	{/*}*/}

	{/*const element = document.createElement(tag);*/}
	{/*const fragments = document.createDocumentFragment();*/}

	{/*if (attrs !== null) {*/}
		{/*const attrsLength = attrs.length;*/}

		{/*for (let name = 0; name < attrsLength; name++) {*/}
// 			if (name && attrs.hasOwnProperty(name)) {
// 				let value = attrs[name];
// 				if (value === true) {
// 					element.setAttribute(name, name);
// 				} else if (value !== false && value != null) {
// 					element.setAttribute(name, value.toString());
// 				}
// 			}
// 		}
// 	}
//
	{/*if (children !== null) {*/}
		{/*if (typeof children === 'string') {*/}
			{/*element.appendChild(*/}
				{/*children.nodeType == null // Falsy on purpose*/}
					{/*? document.createTextNode(children)*/}
					{/*: document.createTextNode('')*/}
			{/*);*/}
		{/*}*/}

		{/*if (typeof children === 'object') {*/}
			{/*const childrenLength = children.length;*/}
//
// 			for (let child = 0; child < childrenLength; child++) {
// 				if (children[child] instanceof HTMLElement) {
// 					fragments.appendChild(children[child]);
				{/*} else if (typeof children[child] === 'string') {*/}
// 					const textnode = document.createTextNode(children[child]);
// 					fragments.appendChild(textnode);
// 				} else {
// 					console.log('not appendable', child);
// 				}
// 			}
// 		}
// 	}
//
// 	element.appendChild(fragments);
//
// 	return element;
// }

function notReact2(nodeName, attributes, ...args) {
	let children = args.length ? [].concat(...args) : null;
	return { nodeName, attributes, children };
}

function render(vnode) {
	if (typeof vnode==='string') return document.createTextNode(vnode);
	let n = document.createElement(vnode.nodeName);
	Object.keys(vnode.attributes || {}).forEach( k => n.setAttribute(k, vnode.attributes[k]) );
	(vnode.children || []).forEach( c => n.appendChild(render(c)) );
	return n;
}

const headline = (
	<h1 className="headline">
		Inital Line
		<br />
		new line
	</h1>
);

const main = (
	<div>
		{headline}
		<p>Lorem ipsum</p>
		<ul>
			<li>
				<a href="">anchor</a>
			</li>
			<li>2</li>
			<li>
				<a href="">anchor2</a> More
			</li>
		</ul>
	</div>
);

const dom = render(main);
const app = document.getElementById('app');

app.appendChild(dom);
