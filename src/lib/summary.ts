// Legacy demo exports; interactive views derive summaries from the shared provider.
import { demoOrders } from "@/data/demo";
import { sharedCost, servingDishes } from "./meal-rules";
export { orderTotal } from "./meal-rules";
export const ordersTotal = sharedCost(demoOrders).total;
export const consolidated = servingDishes(demoOrders);