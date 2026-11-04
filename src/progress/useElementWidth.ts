/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { useEffect, useState, type RefObject } from 'react'

// The width an element really has on screen, in CSS pixels — and again
// whenever it changes (a phone turned sideways, a window resized).
//
// Why the charts need it: an SVG drawn with a fixed `viewBox` and stretched
// to the container's width scales EVERYTHING with it — at 343 px wide a
// chart designed for 640 would draw its 11 px labels at 6 px. Measuring the
// width and drawing at real pixels keeps text, line widths and markers
// their true size at every width; only the time axis stretches.
//
// ResizeObserver is the browser's way to be told when an element's size
// changes (better than the window's `resize`: the element can change size
// without the window doing so). `fallback` until the first measure — and
// in jsdom, which lays nothing out (clientWidth 0) and has no
// ResizeObserver: the tests draw at the fallback width.
export function useElementWidth(ref: RefObject<HTMLElement | null>, fallback: number): number {
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      if (element.clientWidth > 0) setWidth(element.clientWidth)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    // The effect's cleanup: stop observing when the chart leaves the page,
    // or the observer would keep a removed element (and this state) alive.
    return () => observer.disconnect()
  }, [ref])
  return width
}