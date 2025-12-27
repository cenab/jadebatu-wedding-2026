import { event } from "./event.js";

export const emailCopy = {
  subject: `You're invited to ${event.coupleNames}`,
  intro: "Thanks for your RSVP. We are so excited to celebrate with you.",
  closing: "We cannot wait to see you.",
  parking: "Parking is available on-site. Please carpool if you can.",
  reminderSubject: `Reminder: ${event.coupleNames} in 3 days`,
  reminderIntro: "Just a quick reminder that the wedding is coming up soon.",
  reminderClosing: "Safe travels and see you on the dance floor."
};
