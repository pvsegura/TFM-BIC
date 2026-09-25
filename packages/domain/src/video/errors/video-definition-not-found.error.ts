/** No visible video definition has this id. Does not reveal whether a draft, archived or hidden definition exists under it. */
export class VideoDefinitionNotFoundError extends Error {
  constructor(videoDefinitionId: string) {
    super(`Video definition "${videoDefinitionId}" was not found.`);
    this.name = "VideoDefinitionNotFoundError";
  }
}
