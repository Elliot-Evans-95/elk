/** @format */

export const lap = label => {
	const start = new Date().getTime();
	return () => console.log(label, 'took', new Date().getTime() - start, 'ms');
};
