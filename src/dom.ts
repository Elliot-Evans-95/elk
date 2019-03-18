export const elk = (name: any, props: any, ...content: string[]): string => {
    const elkName = name;
    const renderElkName = () => {
        if(typeof elkName === 'string')
            return elkName;
        else
            throw `Ops ${elkName}`;
    };

    const elkContent = content || [];
    const renderElkContent = () => elkContent.join("");

    const elkProps = props || null;
    const renderElkProps = () => {
        if(elkProps === null) return '';

        return Object
            .keys(elkProps)
            .map( (key) => {
                const value = elkProps[key];

                if (key === "className") {
                    return `class=${value}`;
                } else {
                    return `${key}=${value}`
                }
            });
    };

    return `<${renderElkName()} ${renderElkProps()}>${renderElkContent()}</${renderElkName()}>`
};

export default elk;
