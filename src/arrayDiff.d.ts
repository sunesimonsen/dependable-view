export function InsertDiff(index: any, values: any): void;
export class InsertDiff {
    constructor(index: any, values: any);
    _index: any;
    _values: any;
}
export function RemoveDiff(index: any, howMany: any): void;
export class RemoveDiff {
    constructor(index: any, howMany: any);
    _index: any;
    _howMany: any;
}
export function MoveDiff(from: any, to: any, howMany: any): void;
export class MoveDiff {
    constructor(from: any, to: any, howMany: any);
    _from: any;
    _to: any;
    _howMany: any;
}
/** @internal */
export function arrayDiff(before: any, after: any, equalFn: any): RemoveDiff[];
//# sourceMappingURL=arrayDiff.d.ts.map