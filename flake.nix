{
  description = "CLAUDE.md verbs — validate claude.config.json and generate CLAUDE.md, via verbspec";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "aarch64-darwin" "x86_64-darwin" "aarch64-linux" "x86_64-linux" ];
      forAll = f: nixpkgs.lib.genAttrs systems (s: f nixpkgs.legacyPackages.${s});
    in
    {
      # Mountable as a home-manager module (the flake-verbs pattern: a
      # committed bun bundle, wrapped). `verb-claude-md generate <config>` etc.
      homeManagerModules.default = { config, lib, pkgs, ... }:
        let cfg = config.programs.verb-claude-md;
        in {
          options.programs.verb-claude-md.enable =
            lib.mkEnableOption "the verb-claude-md CLI (generate, validate)";
          config = lib.mkIf cfg.enable {
            home.packages = [
              (pkgs.writeShellScriptBin "verb-claude-md" ''
                exec ${pkgs.bun}/bin/bun run ${./dist/cli.js} "$@"
              '')
            ];
          };
        };

      devShells = forAll (pkgs: {
        default = pkgs.mkShell {
          packages = [ pkgs.bun ];
        };
      });
    };
}
