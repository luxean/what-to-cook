export type Meal = {
  id: string
  name: string
  cookedDates: string[]
  rejectionDates: string[]
  consecutiveRejections: number
  archived: boolean
  createdAt: string
}
