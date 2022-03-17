declare class InspectorFrontendHost {
  static closeWindow(): void;
}

declare class DevToolsAPI {
  static showPanel(name: string): void;
  static getInspectedTabId(): number;
  static enterInspectElementMode(): void;
}

declare class SDK {
  static OverlayModel: any;
}