import { resolveConflicts, threeWayMerge, type ConflictChoice, type MergeOptions, type MergeResult } from "./conflict-resolution";
export interface ConflictReviewInput<T extends Record<string,unknown>>{base:T;local:T;remote:T;protectedFields:string[]}
export interface ConflictReview<T extends Record<string,unknown>>{preview:MergeResult<T>;protectedFields:string[]}
export function previewConflictReview<T extends Record<string,unknown>>(input:ConflictReviewInput<T>):ConflictReview<T>{const options:MergeOptions={protectedFields:input.protectedFields,strategy:"manual"};return{preview:threeWayMerge(input.base,input.local,input.remote,options),protectedFields:[...input.protectedFields]};}
/** Complete only after an explicit local/remote decision for every conflict. */
export function completeConflictReview<T extends Record<string,unknown>>(review:ConflictReview<T>,choices:Record<string,ConflictChoice>):T{if(review.preview.conflicts.some(c=>choices[c.field]!=="local"&&choices[c.field]!=="remote"))throw new Error("Every conflict requires an explicit local or remote choice.");return resolveConflicts(review.preview,choices);}
