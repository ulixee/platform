<template>
  <div>
    <form :id="id" class="SEARCH-FORM">
      <label>
        <input
            ref="input"
            :id="`${id}-input`"
            class="header-search__input"
            placeholder="Search documentation..."
            title="Search documentation"
            type="search"
            @focus="onFocus"
        />
        <inline-svg :src="require('@/assets/logos/search.svg')" class="SEARCH-ICON" />
      </label>
    </form>
  </div>
</template>

<script>
  import 'docsearch.js/dist/cdn/docsearch.min.css';

  export default {
    props: {
      id: { type: String, default: 'search' }
    },

    data () {
      return {
        isLoaded: false
      }
    },

    mounted() {
      this.$refs.input.focus()
    },

    methods: {
      onFocus () {
        if (this.isLoaded) return;

        import('docsearch.js').then(({ default: docsearch }) => {
          docsearch({
            indexName: 'ulixee',
            inputSelector: `#${this.id}-input`,
            appId: 'CIMSXQ21FH',
            apiKey: 'b22fc95296f5f3d60c8fbb6857fbdda7',
            debug: process.env.NODE_ENV === 'development'
          });

          this.isLoaded = true;

          this.$nextTick(() => this.$refs.input.focus());
        })
      }
    }
  }
</script>

<style lang="scss">
  .SEARCH-FORM {
    display: block;
    margin-bottom: 0;
    font-size: 0.9rem;
    flex: 1;
    width: 100%;
    position: relative;
    top: 1px;

    label {
      display: flex;
      align-items: center;
    }

    input {
      width: 100%;
      padding: .34rem .8rem;
      border-radius: 5px;
      color: rgba(0,0,0,0.8);
      box-shadow: 1px 1px 10px rgba(44, 4, 50, 0.2);
      transition: background .3s, box-shadow .3s;
      font-size: 14.85px;
      @apply bg-white border border-ulixee-normal;

      &:focus {
        outline: 0;
        box-shadow: 1px 1px 10px rgba(44, 4, 50, 0.2);
      }
    }

    .SEARCH-ICON {
      margin-left: -1.66rem;
      pointer-events: none;
      @apply relative inline-block text-ulixee-normal;
    }

    @media screen and (max-width: 550px) {
      .algolia-autocomplete .ds-dropdown-menu {
        position: fixed!important;
        left:0!important;
        top: var(--header-height)!important;
        right:50px!important;
        &:before {
          display: none!important;
        }
      }
    }

    .algolia-autocomplete {
      width: 100%;
    }
  }

  .algolia-autocomplete .algolia-docsearch-suggestion--wrapper {
    padding-top: 0;
  }
</style>
