import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExercisePhotoCarousel } from './ExercisePhotoCarousel'

describe('ExercisePhotoCarousel', () => {
  it('shows "No photos yet" when there are no images', () => {
    render(<ExercisePhotoCarousel images={[]} exerciseName="Squat" />)
    expect(screen.getByText('No photos yet.')).toBeInTheDocument()
  })

  it('shows the single image with no prev/next controls when there is only one', () => {
    render(
      <ExercisePhotoCarousel
        images={[{ objectKey: 'a.jpg', url: 'https://example.com/a.jpg' }]}
        exerciseName="Squat"
      />,
    )
    expect(screen.getByAltText('Squat photo 1')).toHaveAttribute(
      'src',
      'https://example.com/a.jpg',
    )
    expect(
      screen.queryByRole('button', { name: 'Next photo' }),
    ).not.toBeInTheDocument()
  })

  it('navigates forward and wraps around to the first image', async () => {
    const user = userEvent.setup()
    render(
      <ExercisePhotoCarousel
        images={[
          { objectKey: 'a.jpg', url: 'https://example.com/a.jpg' },
          { objectKey: 'b.jpg', url: 'https://example.com/b.jpg' },
        ]}
        exerciseName="Squat"
      />,
    )
    expect(screen.getByText('1 / 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(screen.getByAltText('Squat photo 2')).toHaveAttribute(
      'src',
      'https://example.com/b.jpg',
    )
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    // Wraps back to the first image past the last one.
    await user.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(screen.getByAltText('Squat photo 1')).toBeInTheDocument()
  })

  it('navigates backward and wraps around to the last image', async () => {
    const user = userEvent.setup()
    render(
      <ExercisePhotoCarousel
        images={[
          { objectKey: 'a.jpg', url: 'https://example.com/a.jpg' },
          { objectKey: 'b.jpg', url: 'https://example.com/b.jpg' },
        ]}
        exerciseName="Squat"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Previous photo' }))
    expect(screen.getByAltText('Squat photo 2')).toBeInTheDocument()
  })
})