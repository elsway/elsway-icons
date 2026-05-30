# Elsway Icons

<!-- BEGIN_OVERVIEW -->
Elsway is a flexible icon family for interfaces, diagrams, presentations — whatever, really.

- 1,248 icons and counting
- 6 weights: **Thin**, **Light**, **Regular**, **Bold**, **Fill**, and **Duotone**
- Designed at 16 x 16px to read well small and scale up big
- Raw stroke information retained to fine-tune the style

More ways to use at [elswayicons.com](https://elswayicons.com).
<!-- END_OVERVIEW -->

## For developers

Elsway is available for [web](https://github.com/elsway-icons/web), [React](https://github.com/elsway-icons/react), [Vue](https://github.com/elsway-icons/vue), [Flutter](https://github.com/elsway-icons/flutter), [Elm](https://github.com/elsway-icons/elsway-elm), and other frameworks and platforms.

### Vanilla Web

- **Simple to use** – We use a similar approach as many other icon sets out there, providing icons as a webfont that uses Unicode's Private Use Area character codes to map normally non-rendering characters to icons. But you don't need to know that. All you need to do is add the stylesheet for each weight you need to the document `<head>`, and drop in icons with an `<i/>` tag and the appropriate class:

```html
<!doctype html>
<html>
  <head>
    <link
      rel="stylesheet"
      type="text/css"
      href="https://cdn.jsdelivr.net/npm/@elsway-icons/web@2.1.1/src/regular/style.css"
    />
    <link
      rel="stylesheet"
      type="text/css"
      href="https://cdn.jsdelivr.net/npm/@elsway-icons/web@2.1.1/src/fill/style.css"
    />
  </head>
  <body>
    <i class="ph ph-smiley"></i>
    <i class="ph-fill ph-heart" style="color: hotpink"></i>
    <i class="ph ph-cube"></i>
  </body>
</html>
```

Check out the full documentation on the [@elsway-icons/web](https://github.com/elsway-icons/web) repo page.

### React

- **Powerful** – Elsway's intuitive but powerful API can style the `color`, `size`, and `weight` of an icon with a few keystrokes, provide default styles to all icons via the Context API, or directly manipulate the SVG at runtime through render props to do some amazing things! Check out the full documentation on the [@elsway-icons/react](https://github.com/elsway-icons/react) repo page.

```jsx
import React from "react";
import ReactDOM from "react-dom";
import { Smiley, Heart, Horse } from "@elsway-icons/react";

const App = () => {
  return (
    <div>
      <Smiley />
      <Heart size={32} color="hotpink" weight="fill" />
      <Horse weight="duotone" />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
```

- **Lightweight** – Supports tree-shaking, so your bundle only includes code for the icons you use.
- **Flexible** – Icon Components are a transparent wrapper around SVG elements, so feel free to add your own inline `style` objects, `onClick` handler functions, and a multitude of other props you're used to using on SVGs.

### Vue

- **Parity** – As with React, you can manipulate the `color`, `size`, and `weight` of an icon with a few keystrokes, or provide default styles to all icons via the `provide/inject` API. It is fully tree-shakable and ready to use right away. Check out the full documentation on the [@elsway-icons/vue](https://github.com/elsway-icons/vue) repo page.

```html
<template>
  <div>
    <PhHorse />
    <PhHeart :size="32" color="hotpink" weight="fill" />
    <PhCube />
  </div>
</template>

<script>
  import { PhHorse, PhHeart, PhCube } from "@elsway-icons/vue";
  export default {
    name: "App",
    components: {
      PhHorse,
      PhHeart,
      PhCube,
    },
  };
</script>
```

> [!NOTE]
> Due to possible namespace collisions with built-in HTML elements, compononent names in the Vue library are prefixed with `Ph`, but otherwise follow the same naming conventions. Both Pascal and kebab-case conventions can be used in templates.

<!-- BEGIN_LINKS -->
## Our Projects

- [@elsway-icons/homepage](https://github.com/elsway-icons/homepage) ▲ Elsway homepage and general info
- [@elsway-icons/core](https://github.com/elsway-icons/core) ▲ Elsway icon assets and catalog
- [@elsway-icons/elm](https://github.com/elsway-icons/elsway-elm) ▲ Elsway icons for Elm
- [@elsway-icons/figma](https://github.com/elsway-icons/figma) ▲ Elsway icons Figma plugin
- [@elsway-icons/flutter](https://github.com/elsway-icons/flutter) ▲ Elsway IconData library for Flutter
- [@elsway-icons/pack](https://github.com/elsway-icons/pack) ▲ Elsway web font stripper to generate minimal icon bundles
- [@elsway-icons/penpot](https://github.com/elsway-icons/penpot) ▲ Elsway icons Penpot plugin
- [@elsway-icons/react](https://github.com/elsway-icons/react) ▲ Elsway icon component library for React
- [@elsway-icons/sketch](https://github.com/elsway-icons/sketch) ▲ Elsway icons Sketch plugin
- [@elsway-icons/swift](https://github.com/elsway-icons/swift) ▲ Elsway icon component library for SwiftUI
- [@elsway-icons/theme](https://github.com/elsway-icons/theme) ▲ A VS Code (and other IDE) theme with the Elsway color palette
- [@elsway-icons/unplugin](https://github.com/elsway-icons/unplugin) ▲ A multi-framework bundler plugin for generating Elsway sprite sheets
- [@elsway-icons/vue](https://github.com/elsway-icons/vue) ▲ Elsway icon component library for Vue
- [@elsway-icons/web](https://github.com/elsway-icons/web) ▲ Elsway icons for Vanilla JS
- [@elsway-icons/webcomponents](https://github.com/elsway-icons/webcomponents) ▲ Elsway icons as Web Components

## Community Projects

- [adamglin0/compose-elsway-icons](https://github.com/adamglin0/compose-elsway-icon) ▲ Elsway icons for Compose Multiplatform
- [altdsoy/elsway_icons](https://github.com/altdsoy/elsway_icons) ▲ Elsway icons for Phoenix and TailwindCSS
- [amPerl/egui-elsway](https://github.com/amperl/egui-elsway) ▲ Elsway icons for egui apps (Rust)
- [babakfp/elsway-icons-svelte](https://github.com/babakfp/elsway-icons-svelte) ▲ Elsway icons for Svelte apps
- [brettkolodny/elsway-lustre](https://github.com/brettkolodny/elsway-lustre) ▲ Elsway icons for Lustre
- [cellularmitosis/elsway-uikit](https://github.com/cellularmitosis/elsway-uikit) ▲ XCode asset catalog generator for Elsway icons (Swift/UIKit)
- [cjohansen/elsway-clj](https://github.com/cjohansen/elsway-clj) ▲ Elsway icons as Hiccup for Clojure and ClojureScript
- [codeat3/blade-elsway-icons](https://github.com/codeat3/blade-elsway-icons) ▲ Elsway icons in your Laravel Blade views
- [dennym/elsway_icons_ex](https://github.com/dennym/elsway_icons_ex) ▲ Elsway icons for Elixir, Phoenix and Ash
- [dreamRs/elsway-r](https://github.com/dreamRs/elswayicons) ▲ Elsway icon wrapper for R documents and applications
- [duongdev/elsway-react-native](https://github.com/duongdev/elsway-react-native) ▲ Elsway icon component library for React Native
- [haruaki07/elsway-svelte](https://github.com/haruaki07/elsway-svelte) ▲ Elsway icons for Svelte apps
- [IgnaceMaes/ember-elsway-icons](https://github.com/IgnaceMaes/ember-elsway-icons) ▲ Elsway icons for Ember apps
- [iota-uz/icons](https://github.com/iota-uz/icons) ▲ Elsway icons as Templ components (Go)
- [jajuma/elswayhyva](https://github.com/JaJuMa-GmbH/elsway-hyva) ▲ Elsway icons for Magento 2 & Mage-OS with Hyvä Theme
- [Kitten](https://kitten.small-web.org/reference/#icons) ▲ Elsway icons integrated by default in Kitten
- [lucagoslar/elsway-css](https://github.com/lucagoslar/elsway-css) ▲ CSS wrapper for Elsway SVG icons
- [maful/ruby-elsway-icons](https://github.com/maful/ruby-elsway-icons) ▲ Elsway icons for Ruby and Rails applications
- [meadowsys/elsway-svgs](https://github.com/meadowsys/elsway-svgs) ▲ Elsway icons as Rust string constants
- [mwood/tamagui-elsway-icons](https://github.com/mwood23/tamagui-elsway-icons) ▲ Elsway icons for Tamagui
- [noozo/elswayicons_elixir](https://github.com/noozo/elswayicons_elixir) ▲ Elsway icons as SVG strings for Elixir/Phoenix
- [oyedejioyewole/nuxt-elsway-icons](https://github.com/oyedejioyewole/nuxt-elsway-icons) ▲ Elsway icons integration for Nuxt
- [pepaslabs/elsway-uikit](https://github.com/pepaslabs/elsway-uikit) ▲ Xcode asset catalog generator for Swift/UIKit
- [raycast/elsway-icons](https://www.raycast.com/marinsokol/elsway-icons) ▲ Elsway icons Raycast extension
- [reatlat/eleventy-plugin-elswayicons](https://github.com/reatlat/eleventy-plugin-elswayicons) ▲ An Eleventy shortcode plugin to embed icons as inline SVGs
- [robruiz/wordpress-elsway-icons-block](https://github.com/robruiz/elsway-icons-block) ▲ Elsway icon block for use in WordPress v5.8+
- [sachaw/solid-elsway](https://github.com/sachaw/solid-elsway) ▲ Elsway icons for SolidJS
- [SeanMcP/elsway-astro](https://github.com/SeanMcP/elsway-astro) ▲ Elsway icons as Astro components
- [SorenHolstHansen/elsway-leptos](https://github.com/SorenHolstHansen/elsway-leptos) ▲ Elsway icon component library for Leptos apps (Rust)
- [vnphanquang/elsway-icons-tailwindcss](https://github.com/vnphanquang/elsway-icons-tailwindcss) ▲ TailwindCSS plugin for Elsway icons
- [wireui/elswayicons](https://github.com/wireui/elswayicons) ▲ Elsway icons for Laravel

If you've made a port of Elsway and you want to see it here, just open a PR [here](https://github.com/elsway-icons/homepage)!

## License

MIT © [Elsway Icons](https://github.com/elsway-icons)
<!-- END_LINKS -->
