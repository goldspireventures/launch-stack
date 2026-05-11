import { ulid } from 'ulid';

/** Sortable, time-prefixed ID generator. Used everywhere instead of cuid/uuid. */
export const newId = () => ulid();

export type ID = string;
