export const PLAN_FEATURES = {
  basic: { maxStudents:500, partWiseMarks:false, advancedAnalytics:false, aiFeatures:false, individualComparison:false, aiAnnouncements:false, attendanceInsights:false, chatRoom:false, selfOnboarding:false },
  premium: { maxStudents:1500, partWiseMarks:true, advancedAnalytics:true, aiFeatures:true, individualComparison:true, aiAnnouncements:true, attendanceInsights:true, chatRoom:true, selfOnboarding:true },
};
export function getPlanFeatures(plan) { return PLAN_FEATURES[plan] || PLAN_FEATURES.basic; }
export function canUseFeature(plan, feature) { return getPlanFeatures(plan)[feature] === true; }
