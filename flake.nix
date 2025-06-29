{
  inputs = { nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable"; };

  outputs = inputs:
    let
      system = "x86_64-linux";
      pkgs = import inputs.nixpkgs { inherit system; };
    in {
      devShells.${system} = {
        default =
          pkgs.mkShell { packages = with pkgs; [ caddy just nixfmt nil ]; };
      };
      formatter.${system} = pkgs.nixfmt;
    };
}
