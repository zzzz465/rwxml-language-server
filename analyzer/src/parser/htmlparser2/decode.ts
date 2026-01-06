
export default function decodeCodePoint(codePoint: number): string {
    if ((codePoint >= 0xd800 && codePoint <= 0xdfff) || codePoint > 0x10ffff) {
        return "\ufffd";
    }
    return String.fromCodePoint(codePoint);
}
