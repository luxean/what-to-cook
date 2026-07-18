export type Meal = {
  id: string
  name: string
  vegetarian?: boolean
  fish?: boolean
  cookedDates: string[]
  rejectionDates: string[]
  consecutiveRejections: number
  archived: boolean
  createdAt: string
}
