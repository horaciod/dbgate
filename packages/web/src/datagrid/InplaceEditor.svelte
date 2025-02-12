<script lang="ts" context="module">
  function getEditedValue(value) {
    if (value?.type == 'Buffer' && _.isArray(value.data)) return '0x' + arrayToHexString(value.data);
    if (value?.$oid) return `ObjectId("${value?.$oid}")`;
    if (_.isPlainObject(value) || _.isArray(value)) return JSON.stringify(value);
    return value;
  }
</script>

<script lang="ts">
  import keycodes from '../utility/keycodes';
  import { onMount, tick } from 'svelte';
  import createRef from '../utility/createRef';
  import _ from 'lodash';
  import { arrayToHexString, parseCellValue, stringifyCellValue } from 'dbgate-tools';
  import { isCtrlOrCommandKey } from '../utility/common';
  import ShowFormButton from '../formview/ShowFormButton.svelte';
  import { showModal } from '../modals/modalTools';
  import EditCellDataModal from '../modals/EditCellDataModal.svelte';

  export let inplaceEditorState;
  export let dispatchInsplaceEditor;
  export let onSetValue;
  export let width;
  export let cellValue;
  export let fillParent = false;

  let domEditor;
  let showEditorButton = true;

  const widthCopy = width;

  const isChangedRef = createRef(!!inplaceEditorState.text);

  function handleKeyDown(event) {
    showEditorButton = false;

    switch (event.keyCode) {
      case keycodes.escape:
        isChangedRef.set(false);
        dispatchInsplaceEditor({ type: 'close' });
        break;
      case keycodes.enter:
        if (isChangedRef.get()) {
          onSetValue(parseCellValue(domEditor.value));
          isChangedRef.set(false);
        }
        domEditor.blur();
        event.preventDefault();
        dispatchInsplaceEditor({ type: 'close', mode: 'enter' });
        break;
      case keycodes.tab:
        if (isChangedRef.get()) {
          onSetValue(parseCellValue(domEditor.value));
          isChangedRef.set(false);
        }
        domEditor.blur();
        event.preventDefault();
        dispatchInsplaceEditor({ type: 'close', mode: event.shiftKey ? 'shiftTab' : 'tab' });
        break;
      case keycodes.s:
        if (isCtrlOrCommandKey(event)) {
          if (isChangedRef.get()) {
            onSetValue(parseCellValue(domEditor.value));
            isChangedRef.set(false);
          }
          event.preventDefault();
          dispatchInsplaceEditor({ type: 'close', mode: 'save' });
        }
        break;
    }
  }

  function handleBlur() {
    if (isChangedRef.get()) {
      onSetValue(parseCellValue(domEditor.value));
      // grider.setCellValue(rowIndex, uniqueName, editor.value);
      isChangedRef.set(false);
    }
    dispatchInsplaceEditor({ type: 'close' });
  }

  onMount(() => {
    domEditor.value = inplaceEditorState.text || stringifyCellValue(cellValue);
    domEditor.focus();
    if (inplaceEditorState.selectAll) {
      domEditor.select();
    }
  });

  $: realWidth = widthCopy ? widthCopy - (showEditorButton ? 16 : 0) : undefined;
</script>

<input
  type="text"
  on:change={() => {
    isChangedRef.set(true);
    showEditorButton = false;
  }}
  on:keydown={handleKeyDown}
  on:blur={handleBlur}
  bind:this={domEditor}
  style={widthCopy ? `width:${realWidth}px;min-width:${realWidth}px;max-width:${realWidth}px` : undefined}
  class:fillParent
  class:showEditorButton
/>

{#if showEditorButton}
  <ShowFormButton
    icon="icon edit"
    on:click={() => {
      isChangedRef.set(false);
      dispatchInsplaceEditor({ type: 'close' });

      showModal(EditCellDataModal, {
        value: stringifyCellValue(cellValue),
        onSave: onSetValue,
      });
    }}
  />
{/if}

<style>
  input {
    border: 0px solid;
    outline: none;
    margin: 0px;
    padding: 0px;
  }

  input.fillParent {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    margin: auto;
  }

  input.showEditorButton {
    margin-right: 16px;
  }
</style>
