import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { failureText } from '@/api/apiErrors'
import { AddressFields } from './AddressFields'
import { addressSchema, type AddressFormValues } from './schemas'
import { EMPTY_ADDRESS_PATCH, toAddressPatch, type AddressPatch } from './api'
import { formatAddressLines } from './format'
import type { Address } from './types'

interface EditableAddressProps {
  label?: string
  address: Address
  // Same contract as EditableField's `save`: the caller decides WHAT is
  // saved (a user's address, a clinic's…); this block only needs the
  // promise, to know when to close and whether it failed.
  save: (address: AddressPatch) => Promise<unknown>
}

// The address counterpart of EditableField. Why a separate component, not
// six EditableFields: the six parts only make sense TOGETHER (a city
// without a country isn't a usable address), the "core fields required
// together" rule spans several fields at once, and the country choice
// changes what the state field looks like. So the whole address is edited
// in one small form and saved in one request.
export function EditableAddress({ label = 'Address', address, save }: EditableAddressProps) {
  const [isEditing, setIsEditing] = useState(false)
  const lines = formatAddressLines(address)

  if (!isEditing) {
    return (
      <div className="flex items-start justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          {lines.length > 0 ? (
            // <address> is the HTML element for contact information.
            // not-italic: browsers italicize it by default.
            <address className="not-italic">
              {lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          ) : (
            <p className="text-muted-foreground italic">Not set</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          aria-label={`Edit ${label}`}
        >
          Edit
        </Button>
      </div>
    )
  }

  return (
    <AddressEditor
      label={label}
      address={address}
      canRemove={lines.length > 0}
      save={save}
      onDone={() => setIsEditing(false)}
    />
  )
}

interface AddressEditorProps {
  label: string
  address: Address
  canRemove: boolean
  save: (address: AddressPatch) => Promise<unknown>
  onDone: () => void
}

// A separate component so that useForm() runs when editing STARTS, not
// when the page first loads. useForm reads `defaultValues` only once, at
// its first render; mounting the form on Edit guarantees it starts from
// the address as it is NOW (e.g. after a previous save), with no extra
// "reset the form when the address changes" code.
function AddressEditor({ label, address, canRemove, save, onDone }: AddressEditorProps) {
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    // The form works with strings ('' = empty); the API gives null for
    // "not set". `?? ''` converts once, on the way in; toAddressPatch
    // converts back ('' → null) on the way out.
    defaultValues: {
      addressLine1: address.addressLine1 ?? '',
      addressLine2: address.addressLine2 ?? '',
      addressCity: address.addressCity ?? '',
      addressState: address.addressState ?? '',
      addressPostalCode: address.addressPostalCode ?? '',
      addressCountry: address.addressCountry ?? '',
    },
  })

  // useWatch, not form.watch(): both give the current country (which
  // decides whether the state field is a dropdown), but watch() is the
  // pattern React Compiler can't safely optimize — the
  // "incompatible-library" lint warning on six existing forms. useWatch is
  // a normal hook that subscribes to just this one field.
  const watchedCountry = useWatch({ control: form.control, name: 'addressCountry' })

  // ONE mutation for both actions (Save and Remove): they send the same
  // kind of request, only the body differs, and they share one
  // pending/error state — while one is in flight, both buttons are off.
  //
  // `(address) => save(address)`, not `save` itself: TanStack Query calls a
  // mutationFn with a SECOND argument (its own context object), and passing
  // `save` directly handed that object to the caller's function too — the
  // trap EditableField's comment describes. The contract is "save this
  // address", nothing more.
  const mutation = useMutation({
    mutationFn: (address: AddressPatch) => save(address),
    onSuccess: onDone,
  })

  const errorMessage = mutation.isError
    ? failureText(mutation.error)
    : null

  return (
    <form
      // handleSubmit runs the Zod schema first (including "line 1, city,
      // postal code and country are required together") and only calls
      // the callback if the values are valid. `void` because it returns a
      // promise we deliberately don't await in an event handler.
      onSubmit={(event) =>
        void form.handleSubmit((values) => mutation.mutate(toAddressPatch(values)))(event)
      }
      className="space-y-3 py-3"
      noValidate
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <AddressFields
        control={form.control}
        register={form.register}
        errors={form.formState.errors}
        watchedCountry={watchedCountry}
      />
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDone}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        {canRemove && (
          // Clearing all six boxes by hand and saving does the same, but an
          // explicit action is clearer — and it doesn't depend on the form
          // being valid first. ml-auto pushes it to the far right, away
          // from Save, so it isn't hit by accident.
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-destructive"
            onClick={() => mutation.mutate(EMPTY_ADDRESS_PATCH)}
            disabled={mutation.isPending}
          >
            Remove address
          </Button>
        )}
      </div>
    </form>
  )
}