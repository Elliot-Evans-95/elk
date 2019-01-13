/** @format */
import { lap } from './helpers';
import { elkCreateElement, elkCreateElement2 } from './createElement';

const endRender = lap('render');

const ui = () => {
	const t = [];
	const NUMBER_OF_ROWS = 10000;

	let i = 0;

	while (i < NUMBER_OF_ROWS) {
		t.push({
			tag: 'h5',
			attrs: null,
			children: 'test123',
		});
		i += 1;
	}

	const div = document.createElement('div');
	const l = t.length;

	for (let i = 0; i < l; i += 1) {
		div.appendChild(elkCreateElement(t[i].tag, t[i].attrs, t[i].children));
	}

	return div;
};

document.querySelector('#app').appendChild(ui());

endRender();
