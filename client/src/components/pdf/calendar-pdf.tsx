import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";

const styles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: '#fff',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
  },
  logo: {
    width: 60,
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    color: '#D9A347',
    marginBottom: 2,
  },
  weekGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  dayCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayHeader: {
    marginBottom: 8,
  },
  dayName: {
    fontSize: 10,
    color: '#963E56',
  },
  dayDate: {
    fontSize: 8,
    color: '#6B7280',
    marginTop: 1,
  },
  roomSection: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  roomName: {
    fontSize: 8,
    color: '#963E56',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  channelText: {
    fontSize: 7,
    color: 'rgba(150, 62, 86, 0.7)',
  },
  planningCard: {
    borderRadius: 2,
    padding: 4,
    marginBottom: 3,
  },
  volunteerName: {
    fontSize: 7,
    color: 'black',
  },
  noPlanning: {
    fontSize: 7,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
});

type Planning = {
  room: { 
    name: string;
    channel?: string; 
  };
  volunteer: { firstName: string; lastName: string };
  date: Date;
};

type CalendarPDFProps = {
  weekStart: Date;
  plannings: Planning[];
  logoUrl?: string;
};

export function CalendarPDF({ weekStart, plannings, logoUrl }: CalendarPDFProps) {
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const getPlanningsForDay = (day: Date) => {
    const dayPlannings = plannings.filter(planning => 
      format(planning.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );

    const roomPlannings = new Map<string, Planning[]>();
    dayPlannings.forEach(planning => {
      const roomName = planning.room.name;
      if (!roomPlannings.has(roomName)) {
        roomPlannings.set(roomName, []);
      }
      roomPlannings.get(roomName)?.push(planning);
    });

    return roomPlannings;
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          <View style={styles.headerContent}>
            <Text style={styles.title}>Week van {format(weekStart, 'd MMMM yyyy', { locale: nl })}</Text>
          </View>
        </View>

        <View style={styles.weekGrid}>
          {weekDays.map((day) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const planningsByRoom = getPlanningsForDay(day);

            return (
              <View key={day.toISOString()} style={[
                styles.dayCard,
                isToday && { borderColor: '#D9A347', borderWidth: 2 }
              ]}>
                <View style={styles.dayHeader}>
                  <Text style={[
                    styles.dayName,
                    isToday && { color: '#D9A347' }
                  ]}>
                    {format(day, 'EEEE', { locale: nl })}
                  </Text>
                  <Text style={styles.dayDate}>
                    {format(day, 'd MMMM', { locale: nl })}
                  </Text>
                </View>

                {Array.from(planningsByRoom.entries()).map(([roomName, roomPlannings]) => (
                  <View key={roomName} style={styles.roomSection}>
                    <View style={styles.roomHeader}>
                      <Text style={styles.roomName}>{roomName}</Text>
                      {roomPlannings[0]?.room.channel && (
                        <View style={styles.channelInfo}>
                          <Text style={styles.channelText}>📻</Text>
                          <Text style={styles.channelText}>{roomPlannings[0].room.channel}</Text>
                        </View>
                      )}
                    </View>
                    {roomPlannings.map((planning, index) => (
                      <View key={index} style={styles.planningCard}>
                        <Text style={styles.volunteerName}>
                          {planning.volunteer.firstName} {planning.volunteer.lastName}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}

                {planningsByRoom.size === 0 && (
                  <Text style={styles.noPlanning}>Geen toewijzingen</Text>
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>
          MEFEN Vrijwilligers Management Systeem • Gegenereerd op {format(new Date(), 'd MMMM yyyy', { locale: nl })}
        </Text>
      </Page>
    </Document>
  );
}