/**
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/. OpenMRS is also distributed under
 * the terms of the Healthcare Disclaimer located at http://openmrs.org/license.
 *
 * Copyright (C) OpenMRS Inc. OpenMRS is a registered trademark and the OpenMRS
 * graphic logo is a trademark of OpenMRS Inc.
 */
package org.openmrs.api;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import org.hibernate.SessionFactory;
import org.openmrs.annotation.Handler;
import org.openmrs.annotation.OpenmrsProfileExcludeFilter;
import org.openmrs.annotation.OpenmrsProfileIncludeFilter;
import org.openmrs.api.context.Context;
import org.openmrs.api.context.ServiceContext;
import org.openmrs.api.db.ContextDAO;
import org.openmrs.api.db.hibernate.AuditableInterceptor;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.api.db.hibernate.HibernateSessionFactoryBean;
import org.openmrs.api.impl.GlobalLocaleList;
import org.openmrs.hl7.HL7Service;
import org.openmrs.hl7.handler.ADTA28Handler;
import org.openmrs.hl7.handler.ORUR01Handler;
import org.openmrs.logging.LoggingConfigurationGlobalPropertyListener;
import org.openmrs.messagesource.MessageSourceService;
import org.openmrs.messagesource.impl.MutableResourceBundleMessageSource;
import org.openmrs.notification.AlertService;
import org.openmrs.notification.MessageService;
import org.openmrs.obs.ComplexObsHandler;
import org.openmrs.obs.handler.BinaryDataHandler;
import org.openmrs.obs.handler.BinaryStreamHandler;
import org.openmrs.obs.handler.ImageHandler;
import org.openmrs.obs.handler.TextHandler;
import org.openmrs.patient.IdentifierValidator;
import org.openmrs.patient.impl.LuhnIdentifierValidator;
import org.openmrs.patient.impl.VerhoeffIdentifierValidator;
import org.openmrs.scheduler.SchedulerService;
import org.openmrs.security.PasswordEncoderConfig;
import org.openmrs.serialization.OpenmrsSerializer;
import org.openmrs.serialization.SimpleXStreamSerializer;
import org.openmrs.util.HttpClient;
import org.openmrs.util.LocaleUtility;
import org.openmrs.util.LocationUtility;
import org.openmrs.util.OpenmrsConstants;
import org.openmrs.util.OpenmrsUtil;
import org.openmrs.util.TestTypeFilter;
import org.openmrs.validator.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.core.task.TaskExecutor;
import org.springframework.orm.jpa.hibernate.HibernateTransactionManager;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.transaction.TransactionManager;

import ca.uhn.hl7v2.app.Application;
import ca.uhn.hl7v2.app.MessageTypeRouter;
import ca.uhn.hl7v2.parser.PipeParser;

/**
 * Provides OpenMRS application-context configuration using Spring annotations.
 *
 * @see org.openmrs.aop.AOPConfig
 * @see org.openmrs.api.cache.CacheConfig
 * @since 3.0.0
 */
@Configuration
@ComponentScan(basePackages = "org.openmrs", includeFilters = {
        @ComponentScan.Filter(type = FilterType.ANNOTATION, classes = Handler.class),
        @ComponentScan.Filter(type = FilterType.CUSTOM, classes = OpenmrsProfileIncludeFilter.class) }, excludeFilters = {
                @ComponentScan.Filter(type = FilterType.CUSTOM, classes = TestTypeFilter.class),
                @ComponentScan.Filter(type = FilterType.CUSTOM, classes = OpenmrsProfileExcludeFilter.class) })
@Import(PasswordEncoderConfig.class)
public class OpenmrsApplicationContextConfig {

	@Bean
	public static BeanFactoryPostProcessor messageSourceAlias() {
		return beanFactory -> beanFactory.registerAlias("messageSourceService", "messageSource");
	}

	@Bean
	public GlobalLocaleList globalLocaleList() {
		return new GlobalLocaleList();
	}

	@Bean
	public EventListeners clearOpenmrsEventListeners() {
		EventListeners listeners = new EventListeners();
		listeners.setGlobalPropertyListenersToEmpty(false);
		return listeners;
	}

	@Bean
	@DependsOn("clearOpenmrsEventListeners")
	public EventListeners openmrsEventListeners(GlobalLocaleList globalLocaleList, LocaleUtility localeUtility,
	        LocationUtility locationUtility, org.openmrs.api.impl.PersonNameGlobalPropertyListener personNameListener,
	        LoggingConfigurationGlobalPropertyListener loggingListener,
	        @Qualifier("adminService") GlobalPropertyListener adminService,
	        @Qualifier("orderService") GlobalPropertyListener orderService) {
		EventListeners listeners = new EventListeners();
		listeners.setGlobalPropertyListeners(List.of(localeUtility, locationUtility, personNameListener, loggingListener,
		    globalLocaleList, adminService, orderService));
		return listeners;
	}

	@Bean
	public ServiceContext serviceContext(PatientService patientService, PersonService personService,
	        ConceptService conceptService, UserService userService, ObsService obsService, EncounterService encounterService,
	        LocationService locationService, OrderService orderService, ConditionService conditionService,
	        DiagnosisService diagnosisService, MedicationDispenseService medicationDispenseService,
	        OrderSetService orderSetService, FormService formService, AdministrationService adminService,
	        DatatypeService datatypeService, ProgramWorkflowService programWorkflowService, CohortService cohortService,
	        MessageService messageService, SerializationService serializationService, SchedulerService schedulerService,
	        AlertService alertService, HL7Service hl7Service, MessageSourceService messageSourceService,
	        VisitService visitService, ProviderService providerService) {
		ServiceContext context = ServiceContext.getInstance();
		context.setPatientService(patientService);
		context.setPersonService(personService);
		context.setConceptService(conceptService);
		context.setUserService(userService);
		context.setObsService(obsService);
		context.setEncounterService(encounterService);
		context.setLocationService(locationService);
		context.setOrderService(orderService);
		context.setConditionService(conditionService);
		context.setDiagnosisService(diagnosisService);
		context.setMedicationDispenseService(medicationDispenseService);
		context.setOrderSetService(orderSetService);
		context.setFormService(formService);
		context.setAdministrationService(adminService);
		context.setDatatypeService(datatypeService);
		context.setProgramWorkflowService(programWorkflowService);
		context.setCohortService(cohortService);
		context.setMessageService(messageService);
		context.setSerializationService(serializationService);
		context.setSchedulerService(schedulerService);
		context.setAlertService(alertService);
		context.setHl7Service(hl7Service);
		context.setMessageSourceService(messageSourceService);
		context.setVisitService(visitService);
		context.setProviderService(providerService);
		return context;
	}

	@Bean(initMethod = "setAuthenticationScheme")
	public Context context(ServiceContext serviceContext, ContextDAO contextDAO) {
		Context context = new Context();
		context.setServiceContext(serviceContext);
		context.setContextDAO(contextDAO);
		return context;
	}

	@Bean
	public List<Resource> mappingJarResources() {
		return new ArrayList<>();
	}

	@Bean
	public AuditableInterceptor auditableInterceptor() {
		return new AuditableInterceptor();
	}

	@Bean
	public HibernateSessionFactoryBean sessionFactory(@Qualifier("mappingJarResources") List<Resource> mappingJarResources) {
		HibernateSessionFactoryBean factory = new HibernateSessionFactoryBean();
		factory.setConfigLocation(new ClassPathResource("hibernate.cfg.xml"));
		factory.setMappingJarLocations(mappingJarResources.toArray(Resource[]::new));
		factory.setPackagesToScan("org.openmrs");
		return factory;
	}

	@Bean
	public DbSessionFactory dbSessionFactory(SessionFactory sessionFactory) {
		return new DbSessionFactory(sessionFactory);
	}

	@Bean
	public HttpClient implementationIdHttpClient() throws java.net.MalformedURLException {
		return new HttpClient("https://implementation.openmrs.org");
	}

	@Bean
	public org.openmrs.validator.AllergyValidator allergyValidator() {
		return new AllergyValidator();
	}

	@Bean
	public org.openmrs.validator.PersonValidator personValidator() {
		return new PersonValidator();
	}

	@Bean
	public org.openmrs.validator.PatientValidator patientValidator() {
		return new PatientValidator();
	}

	@Bean
	public org.openmrs.validator.LocationValidator locationValidator() {
		return new LocationValidator();
	}

	@Bean
	public org.openmrs.validator.PersonNameValidator personNameValidator() {
		return new PersonNameValidator();
	}

	@Bean
	public org.openmrs.validator.PatientIdentifierValidator patientIdentifierValidator() {
		return new PatientIdentifierValidator();
	}

	@Bean
	public org.openmrs.validator.PatientIdentifierTypeValidator patientIdentifierTypeValidator() {
		return new PatientIdentifierTypeValidator();
	}

	@Bean
	public org.openmrs.validator.PersonAttributeTypeValidator personAttributeTypeValidator() {
		return new PersonAttributeTypeValidator();
	}

	@Bean
	public org.openmrs.validator.UserValidator userValidator() {
		return new UserValidator();
	}

	@Bean
	public org.openmrs.validator.RoleValidator roleValidator() {
		return new RoleValidator();
	}

	@Bean
	public org.openmrs.validator.PrivilegeValidator privilegeValidator() {
		return new PrivilegeValidator();
	}

	@Bean
	public org.openmrs.validator.EncounterTypeValidator encounterTypeValidator() {
		return new EncounterTypeValidator();
	}

	@Bean
	public org.openmrs.validator.ConceptClassValidator conceptClassValidator() {
		return new ConceptClassValidator();
	}

	@Bean
	public org.openmrs.validator.ConceptDatatypeValidator conceptDatatypeValidator() {
		return new ConceptDatatypeValidator();
	}

	@Bean
	public org.openmrs.validator.ConceptSourceValidator conceptSourceValidator() {
		return new ConceptSourceValidator();
	}

	@Bean
	public org.openmrs.validator.FormValidator formEditValidator() {
		return new FormValidator();
	}

	@Bean
	public org.openmrs.validator.FieldTypeValidator fieldTypeValidator() {
		return new FieldTypeValidator();
	}

	@Bean
	public org.openmrs.validator.ProgramValidator programValidator() {
		return new ProgramValidator();
	}

	@Bean
	public org.openmrs.validator.StateConversionValidator stateConversionValidator() {
		return new StateConversionValidator();
	}

	@Bean
	public org.openmrs.validator.SchedulerFormValidator taskValidator() {
		return new SchedulerFormValidator();
	}

	@Bean
	public org.openmrs.validator.ObsValidator obsValidator() {
		return new ObsValidator();
	}

	@Bean
	public org.openmrs.validator.OrderValidator orderValidator() {
		return new OrderValidator();
	}

	@Bean
	public org.openmrs.validator.DrugOrderValidator drugOrderValidator() {
		return new DrugOrderValidator();
	}

	@Bean
	public org.openmrs.validator.RequireNameValidator requireNameValidator() {
		return new RequireNameValidator();
	}

	@Bean
	public org.openmrs.validator.ConceptDrugValidator conceptDrugValidator() {
		return new ConceptDrugValidator();
	}

	@Bean
	public org.openmrs.validator.HL7SourceValidator hl7SourceValidator() {
		return new HL7SourceValidator();
	}

	@Bean
	public org.openmrs.validator.PersonAddressValidator personAddressValidator() {
		return new PersonAddressValidator();
	}

	@Bean
	public org.openmrs.validator.VisitTypeValidator visitTypeValidator() {
		return new VisitTypeValidator();
	}

	@Bean
	public org.openmrs.validator.VisitAttributeTypeValidator visitAttributeTypeValidator() {
		return new VisitAttributeTypeValidator();
	}

	@Bean
	public org.openmrs.validator.ProviderAttributeTypeValidator providerAttributeTypeValidator() {
		return new ProviderAttributeTypeValidator();
	}

	@Bean
	public org.openmrs.validator.EncounterValidator encounterValidator() {
		return new EncounterValidator();
	}

	@Bean
	public org.openmrs.validator.LocationAttributeTypeValidator locationAttributeTypeValidator() {
		return new LocationAttributeTypeValidator();
	}

	@Bean
	public org.openmrs.validator.ProviderValidator providerValidator() {
		return new ProviderValidator();
	}

	@Bean
	public org.openmrs.validator.PatientProgramValidator patientProgramValidator() {
		return new PatientProgramValidator();
	}

	@Bean
	public org.openmrs.validator.ConceptValidator conceptValidator() {
		return new ConceptValidator();
	}

	@Bean
	public org.openmrs.validator.PersonMergeLogValidator personMergeLogValidator() {
		return new PersonMergeLogValidator();
	}

	@Bean
	public org.openmrs.validator.ConceptReferenceTermValidator conceptReferenceTermValidator() {
		return new ConceptReferenceTermValidator();
	}

	@Bean
	public org.openmrs.validator.ConceptMapTypeValidator conceptMapTypeValidator() {
		return new ConceptMapTypeValidator();
	}

	@Bean
	public org.openmrs.validator.ConceptAttributeTypeValidator conceptAttributeTypeValidator() {
		return new ConceptAttributeTypeValidator();
	}

	@Bean
	public TransactionManager transactionManager(SessionFactory sessionFactory) {
		return new HibernateTransactionManager(sessionFactory);
	}

	@Bean
	public TaskExecutor taskExecutor() {
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(1);
		executor.setMaxPoolSize(20);
		executor.setQueueCapacity(1000);
		return executor;
	}

	@Bean
	public Map<String, ComplexObsHandler> handlers(ImageHandler imageHandler, TextHandler textHandler,
	        BinaryDataHandler binaryDataHandler, BinaryStreamHandler binaryStreamHandler) {
		Map<String, ComplexObsHandler> map = new LinkedHashMap<>();
		map.put("ImageHandler", imageHandler);
		map.put("TextHandler", textHandler);
		map.put("BinaryDataHandler", binaryDataHandler);
		map.put("BinaryStreamHandler", binaryStreamHandler);
		return map;
	}

	@Bean
	public Map<Class<?>, IdentifierValidator> identifierValidators(LuhnIdentifierValidator luhnIdentifierValidator,
	        VerhoeffIdentifierValidator verhoeffIdentifierValidator) {
		Map<Class<?>, IdentifierValidator> map = new LinkedHashMap<>();
		map.put(LuhnIdentifierValidator.class, luhnIdentifierValidator);
		map.put(VerhoeffIdentifierValidator.class, verhoeffIdentifierValidator);
		return map;
	}

	@Bean
	public List<OpenmrsSerializer> serializerList(SimpleXStreamSerializer simpleXStreamSerializer) {
		List<OpenmrsSerializer> serializers = new ArrayList<>();
		serializers.add(simpleXStreamSerializer);
		return serializers;
	}

	@Bean
	public MutableResourceBundleMessageSource mutableResourceBundleMessageSource() {
		MutableResourceBundleMessageSource messageSource = new MutableResourceBundleMessageSource();
		messageSource.setBasenames("classpath:custom_messages", "classpath:messages");
		messageSource.setUseCodeAsDefaultMessage(true);
		messageSource.setCacheSeconds(5);
		messageSource.setDefaultEncoding("UTF-8");
		return messageSource;
	}

	/**
	 * Provides a PropertySourcesPlaceholderConfigurer that uses
	 * OpenmrsUtil.getApplicationDataDirectory() to resolve the runtime properties file location,
	 * ensuring the property is always set.
	 *
	 * @return configurer
	 */
	@Bean
	public PropertySourcesPlaceholderConfigurer propertySourcesPlaceholderConfigurer() {
		PropertySourcesPlaceholderConfigurer configurer = new PropertySourcesPlaceholderConfigurer();
		String appDataDir = OpenmrsUtil.getApplicationDataDirectory();
		Properties props = new Properties();
		props.setProperty(OpenmrsConstants.KEY_OPENMRS_APPLICATION_DATA_DIRECTORY, appDataDir);
		configurer.setProperties(props);
		configurer.setLocations(new ClassPathResource("hibernate.default.properties"),
		    new ClassPathResource("application.properties"),
		    new FileSystemResource(appDataDir + "/openmrs-runtime.properties"));
		configurer.setIgnoreResourceNotFound(true);
		configurer.setLocalOverride(true);
		return configurer;
	}

	/**
	 * OpenMRS only ever produces and consumes pipe-delimited (ER7) HL7v2 messages. A {@link PipeParser}
	 * is used here instead of a {@code GenericParser} so that XML-encoded payloads are rejected
	 * outright rather than being routed to HAPI's XML parser, which can expose XML external entity
	 * (XXE) processing - external file reads, SSRF and entity-expansion DoS - when its underlying JAXP
	 * factory is not hardened. See HL7Service#parseHL7String.
	 */
	@Bean
	public PipeParser hL7Parser() {
		return new PipeParser();
	}

	@Bean
	public MessageTypeRouter hL7Router() {
		return new MessageTypeRouter();
	}

	@Bean
	public Map<String, Application> hL7Handlers(ORUR01Handler orur01Handler, ADTA28Handler adta28Handler) {
		Map<String, Application> map = new LinkedHashMap<>();
		map.put("ORU_R01", orur01Handler);
		map.put("ADT_A28", adta28Handler);
		return map;
	}
}
