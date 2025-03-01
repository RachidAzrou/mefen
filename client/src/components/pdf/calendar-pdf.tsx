import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";

const styles = StyleSheet.create({
  page: {
    padding: 15,
    backgroundColor: '#fff',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  logo: {
    width: 40,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    color: '#963E56',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 1,
  },
  roomSection: {
    marginBottom: 8,
  },
  roomHeader: {
    backgroundColor: '#963E56',
    padding: 4,
    marginBottom: 4,
    borderRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomName: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  channelInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelText: {
    color: 'white',
    fontSize: 7,
  },
  weekGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  dayCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayHeader: {
    marginBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 2,
  },
  dayName: {
    fontSize: 8,
    color: '#963E56',
    fontWeight: 'bold',
  },
  dayDate: {
    fontSize: 7,
    color: '#6B7280',
    marginTop: 1,
  },
  planningCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 2,
    padding: 3,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  volunteerName: {
    fontSize: 7,
    color: '#111827',
    fontWeight: 'bold',
  },
  noPlanning: {
    fontSize: 7,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 7,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    backgroundColor: 'white',
  },
  contentWrapper: {
    minHeight: 0,
    flexShrink: 1,
    paddingBottom: 40, // Ruimte voor footer
  }
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

  // Group plannings by room
  const roomPlannings = plannings.reduce((acc, planning) => {
    const roomName = planning.room.name;
    if (!acc[roomName]) {
      acc[roomName] = {
        name: roomName,
        channel: planning.room.channel,
        plannings: []
      };
    }
    acc[roomName].plannings.push(planning);
    return acc;
  }, {} as Record<string, { name: string; channel?: string; plannings: Planning[] }>);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              Weekplanning
            </Text>
            <Text style={styles.subtitle}>
              Week van {format(weekStart, 'd MMMM yyyy', { locale: nl })}
            </Text>
          </View>
        </View>

        <View style={styles.contentWrapper}>
          {Object.values(roomPlannings).map((room) => (
            <View key={room.name} style={styles.roomSection} wrap={false}>
              <View style={styles.roomHeader}>
                <Text style={styles.roomName}>
                  {room.name}
                </Text>
                {room.channel && (
                  <View style={styles.channelInfo}>
                    <Text style={styles.channelText}>KANAAL {room.channel}</Text>
                  </View>
                )}
              </View>

              <View style={styles.weekGrid}>
                {weekDays.map((day) => {
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const dayPlannings = room.plannings.filter(p => 
                    format(p.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                  );

                  return (
                    <View key={day.toISOString()} style={[
                      styles.dayCard,
                      isToday && { borderColor: '#963E56', borderWidth: 1 }
                    ]}>
                      <View style={styles.dayHeader}>
                        <Text style={[
                          styles.dayName,
                          isToday && { color: '#963E56' }
                        ]}>
                          {format(day, 'EEEE', { locale: nl })}
                        </Text>
                        <Text style={styles.dayDate}>
                          {format(day, 'd MMMM', { locale: nl })}
                        </Text>
                      </View>

                      {dayPlannings.map((planning, index) => (
                        <View key={index} style={styles.planningCard}>
                          <Text style={styles.volunteerName}>
                            {`${planning.volunteer.firstName} ${planning.volunteer.lastName[0]}.`}
                          </Text>
                        </View>
                      ))}

                      {dayPlannings.length === 0 && (
                        <Text style={styles.noPlanning}>Geen toewijzingen</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          MEFEN Vrijwilligers Management Systeem • Gegenereerd op {format(new Date(), 'd MMMM yyyy', { locale: nl })}
        </Text>
      </Page>
    </Document>
  );
}