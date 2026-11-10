const { MessagingResponse } = require('twilio').twiml;
const { User, Student, Mark, Attendance } = require('../models');

exports.handleIncomingWhatsApp = async (req, res) => {
    const rawNumber = req.body.From.replace('whatsapp:', ''); // Result: +919677637369
    const incomingMsg = req.body.Body.toLowerCase().trim();
    const twiml = new MessagingResponse();

    try {
        // 1. Find the User by exact phone match
        const user = await User.findOne({ where: { phone: rawNumber } });

        if (!user) {
            twiml.message(`Welcome! We couldn't find a parent registered with ${rawNumber}. Please check your portal settings.`);
            return res.type('text/xml').send(twiml.toString());
        }

        // 2. Find the Student linked to this Parent's ID
        const student = await Student.findOne({ where: { parent_id: user.id } });

        if (!student) {
            twiml.message(`Hello ${user.name}, your account is active, but no student is linked to your ID in our system.`);
            return res.type('text/xml').send(twiml.toString());
        }

        // 3. Command: MARKS
        if (incomingMsg === 'marks') {
            const marksData = await Mark.findAll({ where: { student_id: student.id } });

            if (marksData.length === 0) {
                twiml.message(`No marks found for ${student.name} yet.`);
            } else {
                let report = `📊 *Report Card: ${student.name}*\n\n`;
                marksData.forEach(m => {
                    // Note: using 'm.marks' because that's the column in your Mark model
                    report += `🔹 ${m.subject}: ${m.marks}/${m.max_marks} (${m.exam_type})\n`;
                });
                twiml.message(report);
            }
        }
        // 4. Command: ATTENDANCE
        else if (incomingMsg === 'attendance') {
            const today = new Date().toISOString().split('T')[0];
            const attendanceRecord = await Attendance.findOne({ where: { student_id: student.id, date: today } });

            twiml.message(attendanceRecord
                ? `📅 ${student.name} is marked *${attendanceRecord.status.toUpperCase()}* today.`
                : `No attendance uploaded for ${student.name} today.`);
        }
        // 5. Default Response
        else {
            twiml.message(`Hello ${user.name}! Type *MARKS* for grades or *ATTENDANCE* for today's status.`);
        }

    } catch (error) {
        console.error("Database Error:", error);
        twiml.message("⚠️ The school database is temporarily unreachable. Please try again in a few minutes.");
    }

    res.type('text/xml').send(twiml.toString());
};
