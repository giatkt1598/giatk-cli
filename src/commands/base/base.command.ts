export abstract class BaseCommand {
  abstract executeAsync(): Promise<void>;
}
