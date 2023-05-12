import Router from 'vue-router';
// path to store file

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $router: TypesConfig extends Record<'$router', infer T> ? T : Router;
  }
}
