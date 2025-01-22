export function decodeLatex(latex: string): string {
    const txt = document.createElement("textarea");
    txt.innerHTML = latex;
    return txt.value;
}
