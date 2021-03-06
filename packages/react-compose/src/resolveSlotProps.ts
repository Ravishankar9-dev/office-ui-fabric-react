import * as React from 'react';
import { defaultMappedProps } from './defaultMappedProps';
import { ComposePreparedOptions, GenericDictionary, MergePropsResult } from './types';
import { mergeSlotProp } from './mergeSlotProp';

export const NullRender = () => null;

/**
 * Helper utility which resolves the slots and slot props derived from user input.
 */
export function resolveSlotProps<TProps, TState = TProps>(
  result: MergePropsResult<TState>,
  options: ComposePreparedOptions<TProps, TState>,
): MergePropsResult<TState> {
  const { state, slots, slotProps } = result;

  // Derive the default slot props from the config, if provided.
  options.slotProps.forEach(definition => {
    // tslint:disable-next-line:no-any
    const nextSlotProps = definition(state as any);

    Object.keys(nextSlotProps).forEach(key => {
      slotProps[key] = { ...slotProps[key], ...nextSlotProps[key] };
    });
  });

  //  Mix unrecognized props onto root, appropriate, excluding the handled props.
  assignToMapObject(slotProps, 'root', getUnhandledProps(state, options));

  // Iterate through slots and resolve shorthand values.
  Object.keys(slots).forEach((slotName: string) => {
    const slot = slots[slotName];
    // tslint:disable-next-line:no-any
    const slotProp = (state as any)[slotName];

    if (slot && slotProp !== undefined && slotProp !== null) {
      const mergedSlotProp = mergeSlotProp(
        slotProp,
        slotProps[slotName],
        (slot && slot.shorthandConfig && slot.shorthandConfig.mappedProp) || defaultMappedProps[slot],
      );

      const isChildrenFunction = typeof mergedSlotProp.children === 'function';
      if (isChildrenFunction || React.isValidElement(mergedSlotProp.children)) {
        const { children, ...restProps } = slotProp;

        slots[slotName] = React.Fragment;
        slotProps[slotName] = {
          children: isChildrenFunction
            ? mergedSlotProp.children(slot, { ...slotProps[slotName], ...restProps })
            : mergedSlotProp.children,
        };
      } else {
        slotProps[slotName] = mergedSlotProp;
      }
    }

    // Ensure no slots are falsey
    if (!slots[slotName] || slotProp === null) {
      slots[slotName] = NullRender;
    }
  });

  return result;
}

function assignToMapObject(map: Record<string, {}>, key: string, value: {}) {
  if (value) {
    if (!map[key]) {
      map[key] = {};
    }
    map[key] = { ...map[key], ...value };
  }
}

function getUnhandledProps<TProps, TState>(
  props: GenericDictionary,
  options: ComposePreparedOptions<TProps, TState>,
): GenericDictionary {
  const unhandledProps: GenericDictionary = {};
  const slots = Object.keys(options.slots);

  for (const key of Object.keys(props)) {
    if (
      key !== 'className' &&
      key !== 'as' &&
      options.handledProps.indexOf(key as keyof TProps) === -1 &&
      slots.indexOf(key) === -1
    ) {
      unhandledProps[key] = props[key];
    }
  }

  return unhandledProps;
}
