import type { RoomListItem, RoomRow } from "@/shared/roomTypes";
import type { GameStatus } from "@/shared/types";
import { getMockRoomStore } from "@/app/server/supabase/mock/store";

type QueryError = Error & { code?: string };
type QueryResult<T> = { data: T; error: null } | { data: null; error: QueryError };

function ok<T>(data: T): QueryResult<T> {
  return { data, error: null };
}

function fail<T>(error: QueryError): QueryResult<T> {
  return { data: null, error };
}

class RoomsQueryBuilder {
  private filters: Array<(row: RoomRow) => boolean> = [];
  private eqValues: Record<string, unknown> = {};
  private columns: string | null = null;
  private orderBy: { column: keyof RoomRow; ascending: boolean } | null = null;
  private op: "select" | "insert" | "update" | null = null;
  private insertRow: Partial<RoomRow> | null = null;
  private updatePatch: Partial<RoomRow> | null = null;
  private expectSingle = false;
  private expectMaybeSingle = false;
  private listPublicSelect = false;
  private insertReturning = false;

  select(columns = "*") {
    this.columns = columns;
    if (this.op === "insert") {
      this.insertReturning = true;
      return this;
    }
    this.op = "select";
    if (
      columns !== "*" &&
      columns.includes("roomid") &&
      columns.includes("invite_code")
    ) {
      this.listPublicSelect = true;
    }
    return this;
  }

  insert(row: Partial<RoomRow>) {
    this.op = "insert";
    this.insertRow = row;
    return this;
  }

  update(patch: Partial<RoomRow>) {
    this.op = "update";
    this.updatePatch = patch;
    return this;
  }

  eq(column: keyof RoomRow | string, value: unknown) {
    this.eqValues[String(column)] = value;
    this.filters.push((row) => row[column as keyof RoomRow] === value);
    return this;
  }

  is(column: keyof RoomRow, value: null) {
    if (value !== null) throw new Error("mock is() only supports null");
    this.filters.push((row) => row[column] == null);
    return this;
  }

  in(column: keyof RoomRow, values: unknown[]) {
    const set = new Set(values);
    this.filters.push((row) => set.has(row[column]));
    return this;
  }

  order(column: keyof RoomRow, opts: { ascending: boolean }) {
    this.orderBy = { column, ascending: opts.ascending };
    return this;
  }

  single() {
    this.expectSingle = true;
    return this.run();
  }

  maybeSingle() {
    this.expectMaybeSingle = true;
    return this.run();
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private async run(): Promise<QueryResult<unknown>> {
    const store = getMockRoomStore();

    try {
      if (this.op === "insert" && this.insertRow) {
        try {
          const row = store.insert(this.insertRow as Omit<RoomRow, "created_at" | "updated_at">);
          if (!this.insertReturning) return ok(null);
          const projected = this.project(row);
          if (this.expectSingle && !projected) {
            return fail(Object.assign(new Error("No rows"), { code: "PGRST116" }));
          }
          return ok(projected);
        } catch (e) {
          return fail(e as QueryError);
        }
      }

      if (this.op === "update" && this.updatePatch) {
        const roomId = this.eqValues.roomid;
        if (typeof roomId !== "string") {
          return fail(new Error("update requires eq(roomid)"));
        }
        const row = store.update(roomId, this.updatePatch);
        return ok(this.project(row));
      }

      if (this.op === "select") {
        if (this.listPublicSelect) {
          const listed = store.listPublic();
          return ok(listed.map((r) => this.project(r)));
        }

        let matches = store.allRooms().filter((row) => this.filters.every((f) => f(row)));

        if (this.orderBy) {
          const { column, ascending } = this.orderBy;
          matches = [...matches].sort((a, b) => {
            const av = String(a[column] ?? "");
            const bv = String(b[column] ?? "");
            return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
          });
        }

        if (this.expectMaybeSingle || this.expectSingle) {
          const row = matches[0] ?? null;
          if (!row && this.expectSingle) {
            return fail(Object.assign(new Error("No rows"), { code: "PGRST116" }));
          }
          return ok(row ? this.project(row) : null);
        }

        return ok(matches.map((r) => this.project(r)));
      }

      return fail(new Error("Unsupported mock query"));
    } catch (e) {
      return fail(e as QueryError);
    }
  }

  private project(row: RoomRow | RoomListItem): RoomRow | RoomListItem {
    if (!this.columns || this.columns === "*") return row;
    const cols = this.columns.split(",").map((c) => c.trim());
    const out: Record<string, unknown> = {};
    for (const col of cols) {
      out[col] = (row as Record<string, unknown>)[col];
    }
    return out as RoomRow;
  }
}

export function from(table: "rooms") {
  if (table !== "rooms") throw new Error(`mock from() unsupported table: ${table}`);
  return new RoomsQueryBuilder();
}
