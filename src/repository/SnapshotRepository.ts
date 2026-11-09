export interface SnapshotRepository {
  write(payload: string): Promise<void>
  read(): Promise<string | null>
}
